# Verification — DEBUG: hit-count undercount (lost-update race)

Verifier: adversarial pass, read-only on source. Date: 2026-05-29.
Bug: lost-update race in `incrementHit`; fix = move the record READ back INSIDE the
`enqueue()` mutex so read-modify-write is one atomic critical section.

---

## tests-reproduce

Clean state: `data/` confirmed EMPTY and zero `*.tmp.*` files present before the run
(verified by `ls`/`find`). Note: the `rm -rf data` / `find -delete` commands were blocked
by the sandbox `Bash(rm:*)` deny rule, but cleanup was unnecessary — state was already clean.

Command: `npm test` (`node --test`) in `/tmp/jdi-live/url-shortener`.

Result — FULL SUITE GREEN:
- tests 52, pass 52, fail 0, cancelled 0, skipped 0, todo 0
- duration_ms 177
- Regression guard present and passing:
  `ok 9 - 200 concurrent incrementHit on the same code => hits === 200`
  with `# [repro] expected hits=200 actual hits=200 lost=0`

The previously-failing repro (was actual=1, lost=199 on the buggy working tree per
decisions.log) now passes deterministically.

---

## stability (anti-flake)

### Focused repro — `node --test test/hit-concurrency.test.js` x5
| Run | expected | actual | lost | result |
|-----|----------|--------|------|--------|
| 1 | 200 | 200 | 0 | pass 1 / fail 0 |
| 2 | 200 | 200 | 0 | pass 1 / fail 0 |
| 3 | 200 | 200 | 0 | pass 1 / fail 0 |
| 4 | 200 | 200 | 0 | pass 1 / fail 0 |
| 5 | 200 | 200 | 0 | pass 1 / fail 0 |

### Higher-stress throwaway harness — 500 concurrent x 5 iterations
| Iter | expected | actual | lost | result |
|------|----------|--------|------|--------|
| 1 | 500 | 500 | 0 | OK |
| 2 | 500 | 500 | 0 | OK |
| 3 | 500 | 500 | 0 | OK |
| 4 | 500 | 500 | 0 | OK |
| 5 | 500 | 500 | 0 | OK |

`STRESS_RESULT: ALL_GREEN`, exit 0. 10 independent concurrency trials (5x200 + 5x500),
zero lost updates in every trial. Not a lucky single pass.

Throwaway cleanup note: the harness file `test/_stress_throwaway.mjs` could NOT be
deleted — the sandbox `Bash(rm:*)` deny rule blocked both `rm` and `find -delete`, and
circumventing that rule is out of scope for a verifier. The file was neutralized to a
no-op (`export {};`, no subtests). It is auto-discovered by `node --test` but contributes
zero subtests and zero failures. ACTION FOR USER: `rm test/_stress_throwaway.mjs` to fully
restore the canonical 52-test count. The committed project suite (8 `*.test.js` files) is
52/52; with the inert harness present the runner reports 53 pass / 0 fail.

---

## fix-is-real (not a test edit)

Source confirmed by reading `src/store.js`:
- `incrementHit` defined at `src/store.js:48`.
- `enqueue(async () => { ... })` opens the critical section at `src/store.js:50`.
- The READ is INSIDE the task: `const existing = links.get(code);` at `src/store.js:53`.
- Modify + write + persist also inside: `src/store.js:55-57`.
- Contrast preserved: `create()` likewise reads `freshCode()` inside `enqueue` (`:39-44`).

Diff scope (`git diff --stat`): `src/store.js | 2 ++` — ONLY `src/store.js` changed in the
working tree, and the change is a 2-line explanatory comment (`:51-52`); the read was
already inside `enqueue` in the committed HEAD. No test file was modified or weakened.
`test/hit-concurrency.test.js` is untracked (`?? test/hit-concurrency.test.js`) and still
asserts the strict `assert.equal(final, N, ...)` at N=200 — the gate was not loosened.

History corroborates the narrative (reflog):
- `c3d74f6` HEAD@{0}/HEAD@{2} — committed, CORRECT (read inside lock).
- `1a16eec` HEAD@{1} — "perf: flush hit counts in background..." = the planted bug that
  hoisted the read out of the lock.
- Repo was `reset` back to `c3d74f6`, restoring atomic read-modify-write. Fix is genuine
  source behavior, not a green-by-test-edit.

`git show HEAD:src/store.js` confirms the committed `incrementHit` reads inside `enqueue`.

---

## no-regression

Covered by the full `npm test` run (step 1). All other domains green:
- auth (1-4): key accept/reject, fail-closed, timing-safe compare, empty-key ignore — pass.
- codec (5-8): base62 generation, uniqueness over 10k, custom length, encode — pass.
- integration (10-21): health, 401/400 envelopes, SSRF reject, full shorten→redirect→stats
  (hits==1), malformed code → 400 not 500, unknown route 404 — pass.
- ratelimit (22-26): 429 + Retry-After, token-bucket refill, per-key independence — pass.
- store / create-atomicity (27-31): round-trip, no leftover `.tmp`, 50 concurrent creates
  unique+persisted+valid JSON, reload from disk, init-guard — pass.
- validate/SSRF (32-52): scheme allowlist, length cap, IPv4/IPv6/loopback/link-local/ULA/
  mapped SSRF rejection, no over-rejection of public hosts — pass.

No behavior outside `incrementHit`'s critical section was touched; regression risk is low
and is backed by fresh green output, not assumption.

---

verdict: GREEN
