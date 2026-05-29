# /just-do-it

**One objective in, a verified result out.** A Claude Code skill that takes a single objective
through a full, gated development process using expert subagents — then refuses to declare success
until a machine-checkable gate passes.

Borrows the workflow of [oh-my-symphony](https://github.com/cskwork/oh-my-symphony) — gated lanes, a
single shared vault, untrusted `claims.md` re-verified by an adversary, a literal-bash delivery gate
that is never edited to pass — but strips the heavy Symphony CLI / TUI / worktree infrastructure.
Everything runs in-session with the `Task`/`Agent` tool. **Nothing to install but the skill itself.**

## Three modes

`/just-do-it` detects the mode from your objective:

| Objective looks like | Mode | Pipeline |
|---|---|---|
| "build / ship a new app/tool" | **GREENFIELD** | Intake → **Validate (market/demand)** → Plan → Build → Verify → QA → Deliver |
| "fix / broken / failing / why does" | **DEBUG** | Intake → Reproduce → Diagnose → Fix → Verify → Deliver |
| "add X to our existing/legacy code" | **LEGACY** | Intake → Explore → Plan → Build → Verify → QA → Deliver |

```text
/just-do-it build a habit-tracker app and ship it
/just-do-it the checkout page hangs intermittently in prod — fix it
/just-do-it add SSO to our legacy Django monolith
```

## Why it exists

A single agent given a big objective drifts: it skips validation, trusts its own "done", and leaves
unverified claims. `/just-do-it` imposes the discipline a senior team would — and the research backs
each choice (see [`DESIGN.md`](DESIGN.md) and [`docs/research-brief.md`](docs/research-brief.md)):

- **Topology, not preference, picks the architecture** — fan out for wide-and-shallow work
  (validation, scaffolding); single-driver for deep-and-narrow work (one bug, one feature).
- **Builder ≠ Verifier** — the agent that writes code never approves it. A fresh adversarial Verify
  agent re-runs every `run-to-prove` from a clean state. (`claims.md` is untrusted.)
- **Two-layer done-gate** — a hard gate (tests/lint/build, deterministic) plus a soft committee
  (architect + security + code-review). The rubric can never override a failing test.
- **Gate on the project's own suite in a clean sandbox** — never benchmarks, never self-report.
- **Bounded retry + circuit breaker** — same error 3× → stop, root-cause, escalate. No infinite loops.

## The non-negotiable gates

1. Validate-before-build (GREENFIELD).  2. Plan freezes scope.  3. Builder ≠ Verifier.
4. Multi-expert review before deliver.  5. Literal delivery gate (`templates/delivery-gate.sh` exits 0).
6. Bounded retry + circuit breaker.

## Install

This repo **is** the skill. Put it where Claude Code finds skills:

```bash
git clone https://github.com/cskwork/just-do-it-skill.git
# then either symlink or copy it into your global skills dir:
ln -s "$(pwd)/just-do-it-skill" ~/.claude/skills/just-do-it
# or: cp -R just-do-it-skill ~/.claude/skills/just-do-it
```

Then in Claude Code: `/just-do-it <your objective>`.

## Layout

```
SKILL.md            thin spine: mode detection, gates, reference map
reference/          pipeline · experts · vault · market-research · quality-gates · debugging
templates/          delivery-gate.sh (the literal gate) · state.json
DESIGN.md           research → decision mapping (cited)
docs/               research-brief.md (fact-checked) + index.html (landing page)
examples/url-shortener/   a real service the harness built/debugged/extended, with harness-audit/
```

## Proof it works (live validation)

All three modes were run end-to-end on a real, production-grade service (a zero-dependency URL
shortener — see [`examples/url-shortener/`](examples/url-shortener/), 68 tests). The audit trail for
each run is in [`examples/url-shortener/harness-audit/`](examples/url-shortener/harness-audit/).

- **GREENFIELD** — the adversarial Verify caught **2 real SSRF bypasses** (`[::ffff:127.0.0.1]`,
  `localhost.`) and an unauth-500 that all passed the builder's own green tests, before shipping.
- **DEBUG** — given only a symptom ("hits undercount under load"), it reproduced (200 concurrent →
  1/200), root-caused a **lost-update race**, stopped at the approval gate, fixed, and re-verified
  with anti-flake concurrency runs (0 lost across 10 trials).
- **LEGACY** — added link-expiry (TTL) with **zero regressions** (backward-compatible with records
  that predate the field), committee-approved, gate-green.

Adversarial verification caught a real defect in 2 of 3 runs.

## Credit

Concept and workflow adapted from **oh-my-symphony** by cskwork
(https://github.com/cskwork/oh-my-symphony). Built for Claude Code.

## License

MIT — see [`LICENSE`](LICENSE).
