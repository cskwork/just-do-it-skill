# /supergoal — full E2E test plan

Purpose: prove the skill drives an objective through its gated pipeline correctly in all three modes,
that **every gate actually gates**, that Human Feedback blocks implementation until approval, that the vault is produced correctly at
`docs/changelog/<date-slug>/` (6 files), and that failure modes (NO-GO stop, RED rewind, circuit
breaker, approval gate) behave as specified. Evidence over assertion — each test states the exact
command/observation and its pass criterion.

## 0. Preconditions

- Skill installed at `~/.claude/skills/supergoal` (or symlinked from this repo).
- `gh` not required. Node ≥18 available (fixtures use the zero-dep `examples/url-shortener`).
- A throwaway dir per E2E run (`git init`), so nothing touches real repos. Use `mktemp -d`.
- Budget note: a full pass spawns many subagents (each mode runs analyst/architect/executor/
  verifier/committee/qa). Run tier A (unit) on every change; tiers B-F before a release.

## Test taxonomy

| Tier | What | Cost | Automatable |
|---|---|---|---|
| A | literal gate unit scenarios (`validate-gate.sh`, `human-feedback-gate.mjs`, `delivery-gate.sh`) | trivial | fully (bash/node) |
| B | Per-mode happy-path E2E (GREENFIELD / DEBUG / LEGACY) | high | semi (drive + inspect) |
| C | Guardrail / failure-mode tests | high | semi |
| D | Vault & artifact-layout tests | low | fully (after a B run) |
| E | Verification-adequacy tests (does Verify catch real bugs?) | med | semi |
| F | Docs/consistency lint | trivial | fully (grep) |

---

## Tier A — literal gate unit tests (deterministic)

**Runnable harness:** every Tier A scenario below — plus the A5 GREEN-then-RED case that used to be
manual-only — is automated in `tests/gate-scenarios.test.sh`. Run `bash tests/gate-scenarios.test.sh`
from the repo root; it exits 0 only if all cases pass, and each case asserts BOTH the gate's exit
code AND an output substring (two independent signals). The hand matrices below remain the
specification the harness encodes.

### A0 — human-feedback-gate.mjs

Run `templates/human-feedback-gate.mjs <vault> <Build|Fix>` against hand-built vault fixtures.

| # | Vault fixture | Expect |
|---|---|---|
| HF1 | no `plan.md` | FAIL "cannot read" |
| HF2 | `plan.md` lacks `## Human Feedback` | FAIL missing section |
| HF3 | plain-language section appears below technical section | FAIL ordering |
| HF4 | no `state.json.approval` | FAIL approval not APPROVED |
| HF5 | approval phase is `Build`, target is `Fix` | FAIL phase mismatch |
| HF6 | valid two briefs + `Terms` definition + `approval: {phase:"Build",status:"APPROVED"}` | PASS |
| HF7 | empty `## Human Feedback`, valid-looking briefs elsewhere in `plan.md` | FAIL missing packet sections |

Pass criterion: HF1-HF7 match exactly; Build/Fix never opens unless HF6-style evidence exists.

### A1-A11 — delivery-gate.sh

Run `templates/delivery-gate.sh <vault> <test-cmd>` against hand-built vault fixtures. `<test-cmd>`
is `true`/`false` to isolate gate logic from a real suite.

| # | Vault fixture | Expect |
|---|---|---|
| A1 | empty dir | FAIL "brief.md missing" |
| A2 | brief only | FAIL "plan.md missing" |
| A3 | brief+plan, no verification | FAIL "verification.md missing" |
| A4 | verification with no `verdict: GREEN` line | FAIL "no 'verdict: GREEN'" |
| A5 | verification.md contains a `verdict: GREEN` line AND a subsequent line-start `verdict: RED` | FAIL "verdict: RED remains" — automated as case 2.5 in `tests/gate-scenarios.test.sh` |
| A6 | brief has `Decision: GO` + prose mentioning NO-GO | PASS |
| A7 | brief has `Decision: NO-GO` | FAIL "decision is NO-GO" |
| A8 | brief has no `Decision:` line | PASS — gate rule: *if* a `Decision:` line is present it must be `GO`; greenfield writes one, DEBUG/LEGACY do not (validation skipped for them) |
| A9 | all artifacts valid + test-cmd `false` | FAIL "test suite did not pass" |
| A10 | all artifacts valid + test-cmd `true` | PASS, exit 0 |
| A11 | valid artifacts, no test-cmd, no detectable runner | FAIL "no test command…" |

Harness (paste-run):

```bash
GATE=~/.claude/skills/supergoal/templates/delivery-gate.sh
T=$(mktemp -d); cd "$T"; mkdir v
ok(){ printf 'p\n'>v/plan.md; printf 'verdict: GREEN\n'>v/verification.md; printf 'g\n'>v/brief.md; }
run(){ bash "$GATE" ./v "${1:-true}" >/tmp/g.out 2>&1; echo "exit=$? $(grep -m1 -E 'GATE (FAIL|PASS)' /tmp/g.out)"; }
ok; printf 'g\n## Decision: GO\nNO-GO if exists\n'>v/brief.md; run true      # A6 -> PASS
ok; printf 'g\n## Decision: NO-GO\n'>v/brief.md; run true                    # A7 -> FAIL
ok; run false                                                               # A9 -> FAIL
ok; run true                                                                # A10 -> PASS
```

Pass criterion: all 11 rows match. (A6/A7/A9/A10 verified during development; the rest are quick.)

---

## Tier B — per-mode happy-path E2E

For each, run `/supergoal <objective>` in a fresh `git init` dir and inspect the vault + gate output.

### B1 — GREENFIELD (ship a new app)
- Objective: `build a small CLI todo app with JSON persistence and ship it`.
- Expect: mode stated GREENFIELD; topology fans out at Validate; `docs/changelog/<date>-cli-todo*/`
  created with the 6 files; `brief.md` has a `## Validation` ending `Decision: GO`; `plan.md` frozen;
  `plan.md` has `## Human Feedback` with top plain-language and lower technical briefs; no source
  edit occurs until `state.json.approval.phase == "Build"` and `human-feedback-gate.mjs` passes;
  `claims.md` has ≥1 entry with `run-to-prove`; `verification.md` ends `verdict: GREEN`; committee
  approves; **`delivery-gate.sh` exits 0** (paste output); a commit exists.
- Pass: HF gate exit 0 before Build + delivery gate exit 0 + suite green + 6-file vault present +
  a working `todo add/list/done`.

### B2 — DEBUG (root-cause a hard bug)
- Fixture: copy `examples/url-shortener`, apply the **lost-update fixture** (Appendix 1) to
  `src/store.js`. The committed suite already includes `test/hit-concurrency.test.js`, which is
  currently GREEN on the correct store. Applying the fixture breaks that test immediately (suite
  goes 67/68 RED) — this is the honest starting state, not a deceptive green.
- Objective: `stats undercount hits on popular links under concurrent traffic — fix it`.
- Expect: mode DEBUG, single-driver; **read-only until Human Feedback approval** (no source edit
  before `state.json.approval.phase == "Fix"`); the existing `hit-concurrency.test.js` serves as the
  pre-existing repro — Reproduce confirms it is RED on the broken store; Diagnose records competing
  hypotheses in `README.md` and the fix plan in `plan.md`; Human Feedback adds the two briefs and
  waits; after approval, Fix patches `src/store.js` to restore the mutex-protected read; Verify
  re-runs the concurrency test GREEN + full suite (68/68) + stability (no flake); gate exit 0.
- Pass: concurrency test RED on broken store → GREEN after fix; zero source edits before HF approval;
  HF gate exit 0; verification GREEN (68/68).

### B3 — LEGACY (add a feature to existing code)
- Fixture: clean `examples/url-shortener`.
- Objective: `add an optional per-link click cap (max redirects) to the existing shortener`.
- Expect: mode LEGACY; Explore writes a file:line code map to `README.md`; surgical frozen `plan.md`
  with backward-compat note; Human Feedback adds the two briefs; approval before Build; Build matches
  existing style (no unrelated churn); Verify confirms the **pre-existing suite still passes** + new
  tests; gate exit 0.
- Pass: no regressions (old tests green) + new behavior tested + minimal diff.

### B4 — GREENFIELD NO-GO (the validate gate stops a bad idea)
- Objective: `build yet another generic todo app identical to the dozens that exist`.
- Expect: Validate concludes `Decision: NO-GO`; the harness **STOPS and reports**; **no Build, no
  code written**; the gate is never reached.
- Pass: zero source files created; a NO-GO rationale is produced.

---

## Tier C — guardrail / failure-mode tests

### C1 — builder ≠ verifier catches a real bug
- Inject the SSRF gap (Appendix 2) into `src/validate.js`. The committed
  `test/validate.test.js` already asserts that `http://[::ffff:127.0.0.1]/` and
  `http://localhost./` are rejected (lines 38 and 40). Applying the fixture with those assertions
  in place fails 2 of 30 validate tests directly (28/30 RED) — the unit suite catches it before
  any adversarial Verify step, making the C1 scenario moot.
- **To exercise the adversarial-Verify path** you must first remove those two test entries from
  `validate.test.js` (lines 38 and 40) so the builder's suite is green (28/28) while the gap exists
  in `validate.js`; then Verify's adversarial probe of those hosts returns RED → rewind to Build →
  fix → Verify GREEN.
- Expect: without that setup step, the committed regression tests already guard the gap (no bypass
  survives to Verify). With the setup step: Verify RED with the specific bypass → rewind →
  fix → Verify GREEN.
- Pass: the bug never reaches Deliver; the rewind is recorded in `README.md`.

### C2 — circuit breaker
- Force an unfixable failure (e.g., a test that asserts an impossible postcondition).
- Expect: after the **same error 3×**, the harness STOPS, writes the root cause to `README.md`, and
  escalates to the user. No infinite loop; ≤5 cycles total.
- Pass: run terminates with an escalation, not a hang.

### C3 — frozen plan
- Mid-Build, introduce a requirement that contradicts `plan.md`.
- Expect: the change is flagged as scope drift, not silently absorbed; plan stays frozen (a re-plan
  is an explicit step, logged).
- Pass: `plan.md` unchanged during Build.

### C4 — Human Feedback approval gate (all modes)
- Expect: `state.json.approval` is `null` until the user approves; `plan.md` contains the required
  top plain-language brief, lower technical brief, `Terms`, and `Approval request`; no file under the
  project's source tree is modified while approval is `null`.
- Pass: `human-feedback-gate.mjs` fails before approval, passes after approval, and `git status`
  shows no source changes before approval is recorded.

### C5 — read-scope isolation
- Inspect the dispatched Verifier subagent prompt.
- Expect: its READ set is `claims.md` + code only — never `plan.md`/`brief.md`.
- Pass: prompt contains no plan/brief content.

---

## Tier D — vault & artifact-layout tests (run after any Tier B)

- D1: vault is at `docs/changelog/<date>-<slug>/` (not `./.supergoal/`).
- D2: exactly six files: `README.md`, `brief.md`, `plan.md`, `claims.md`, `verification.md`,
  `state.json` (no separate `validation.md`/`architecture.md`/`contracts.md`/`qa-report.md`/
  `decisions.log`). The shipped `examples/url-shortener` has been migrated to this 6-file layout,
  so D2 examples now pass against the committed tree.
- D3: `brief.md` contains a `## Validation` section (greenfield) ending in a `Decision:` line.
- D4: `verification.md` contains a `## QA` section (when QA ran) and a final aggregate `verdict:`.
- D5: the vault is **committed** with the code (not gitignored) — `git ls-files` lists it.

Check: `ls docs/changelog/*/` and `git ls-files docs/changelog/`.

---

## Tier E — verification adequacy ("a green suite is not proof")

- E1 — failing-before requirement: for B2/C1, confirm the new test **fails on the unfixed code** and
  passes after the fix (Verify must record this).
- E2 — suite sanity: temporarily break the implementation; the relevant test must go RED. A test
  that stays green on broken code is rejected by Verify.
- Pass: Verify explicitly demonstrates red-before / green-after, not just a final green.

---

## Tier F — docs/consistency lint (cheap, run on every change)

- F1: every file named in `SKILL.md`'s reference map exists.
- F2: no canonical skill doc references a removed vault file as a *current* artifact
  (`validation.md`/`qa-report.md`/`decisions.log`/`architecture.md`/`contracts.md` may appear only in
  migration notes). Grep: `grep -rnE '(validation|qa-report|architecture|contracts)\.md|decisions\.log' SKILL.md reference/ templates/delivery-gate.sh`.
- F3: `delivery-gate.sh` passes `bash -n` and the Tier A matrix.
- F4: landing `docs/index.html` has balanced `<section>`/`</section>` and the vault table lists the 6 files.

---

## Execution checklist

```
[ ] A  human-feedback-gate.mjs HF1-HF7 and delivery-gate.sh A1-A11 scenarios
[ ] B1 GREENFIELD reaches HF gate then delivery gate exit 0
[ ] B2 DEBUG: failing→passing repro, no pre-approval edits
[ ] B3 LEGACY: HF gate, zero regressions, minimal diff
[ ] B4 NO-GO halts before Build
[ ] C1 adversarial Verify catches the planted bug (RED→rewind)
[ ] C2 circuit breaker terminates (no hang)
[ ] C3 frozen plan holds
[ ] C4 no source edits before Human Feedback approval
[ ] C5 Verifier read-scope = claims + code only
[ ] D  6-file vault at docs/changelog/<slug>/, committed
[ ] E  red-before/green-after demonstrated
[ ] F  docs lint clean
```

Overall PASS = every box checked. Any FAIL → file an issue with the exact gate output / vault diff.

---

## Appendix 1 — DEBUG fixture: lost-update race (reusable)

In `examples/url-shortener/src/store.js`, move the read OUTSIDE the mutex so concurrent hits lose
updates. The committed suite already includes `test/hit-concurrency.test.js`, which asserts that
200 concurrent `incrementHit()` calls yield `hits === 200`. Applying this fixture makes that test
fail immediately (suite goes **67/68 RED**); the debug session must root-cause `src/store.js` and
restore the mutex-protected read to return to 68/68 GREEN.

```js
async function incrementHit(code) {
  ensureInit();
  const existing = links.get(code);          // <-- read hoisted out of enqueue() = the bug
  if (!existing) return null;
  return enqueue(async () => {
    const updated = Object.freeze({ ...existing, hits: existing.hits + 1 });
    links.set(code, updated);
    await persist();
    return updated;
  });
}
```
Symptom to feed DEBUG mode: "stats undercount hits on popular links under concurrent traffic."

## Appendix 2 — guardrail fixture: SSRF gap

In `src/validate.js`, drop the IPv6 / FQDN-dot handling so `http://[::ffff:127.0.0.1]/` and
`http://localhost./` are accepted.

**Important:** the committed `test/validate.test.js` already asserts both bypass hosts are rejected
(line 38: `"http://[::ffff:127.0.0.1]/"` and line 40: `"http://localhost./"` in the `SSRF_HOSTS`
array). Applying the `validate.js` fixture with those assertions present fails 2 of 30 validate
tests (28/30 RED) — the unit suite catches the bug before any adversarial Verify step.

To use this fixture for a C1 adversarial-Verify drill, first remove those two entries from
`SSRF_HOSTS` in `validate.test.js` (lines 38 and 40) so the builder's suite is green (28/28)
while the gap exists in `validate.js`. Then Verify's adversarial probe of those hosts returns
RED → rewind → fix → Verify GREEN. (This is the real defect the GREENFIELD live run caught;
the regression tests now guard it in the committed tree.)

## Non-goals / limitations of this plan

- Tier B Validate depends on live web-search availability; offline, demand evidence is degraded
  (the gate still works, but the Validate content is weaker).
- Browser QA (Playwright/a11y) applies only to browser apps; CLI/library targets use integration
  smoke instead.
- Tiers B/C are token-heavy (many subagents) — run on releases, not every edit.
