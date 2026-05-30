# /supergoal

**One objective in, a verified result out.** A Claude Code skill that takes a single objective
through a full, gated development process using expert subagents — then refuses to declare success
until a machine-checkable gate passes.

Gated lanes, a single shared vault, an untrusted `claims.md` re-verified by an adversary, and a
literal-bash delivery gate that is never edited to pass. Everything runs in-session with the
`Task`/`Agent` tool. **Nothing to install but the skill itself.** (Workflow inspired by
[oh-my-symphony](https://github.com/cskwork/oh-my-symphony).)

> **New here? Start with the landing page** → **[cskwork.github.io/supergoal-skill](https://cskwork.github.io/supergoal-skill/)**
> — a bilingual (English / 한국어) walkthrough with a 3-step quickstart, the three modes, how the
> builder-vs-verifier split catches real bugs, and the evidence it produces. Best onboarding path before you clone.

## Modes

`/supergoal` detects the mode from your objective:

| Objective looks like | Mode | Pipeline |
|---|---|---|
| "build / ship a new app/tool" | **GREENFIELD** | Intake → **Validate (market/demand)** → Plan → **Human Feedback** → Build → Verify → QA → Deliver |
| "fix / broken / failing / why does" | **DEBUG** | Intake → Reproduce → Diagnose → **Human Feedback** → Fix → Verify → Deliver |
| "add X to our existing/legacy code" | **LEGACY** | Intake → Explore → Plan → **Human Feedback** → Build → Verify → QA → Deliver |
| "explain / understand / teach me X" (learn, no code) | **LEARN** | Intake → Source → Bridge → Teach loop → Check (explain-back) → Journal |

```text
/supergoal build a habit-tracker app and ship it
/supergoal the checkout page hangs intermittently in prod — fix it
/supergoal add SSO to our legacy Django monolith
```

## Why it exists

A single agent given a big objective drifts: it skips validation, trusts its own "done", and leaves
unverified claims. `/supergoal` imposes the discipline a senior team would — and the research backs
each choice (see [`DESIGN.md`](DESIGN.md) and [`docs/research-brief.md`](docs/research-brief.md)):

- **Topology, not preference, picks the architecture** — fan out for wide-and-shallow work
  (validation, scaffolding); single-driver for deep-and-narrow work (one bug, one feature).
- **Builder ≠ Verifier** — the agent that writes code never approves it. A fresh adversarial Verify
  agent re-runs every `run-to-prove` from a clean state. (`claims.md` is untrusted.)
- **Human Feedback before implementation** — after intake/repro/diagnosis/planning, the skill pauses
  with two briefs: plain language first, then a novice-dev-friendly technical brief with term definitions.
- **Two-layer done-gate** — a hard gate (tests/lint/build, deterministic) plus a soft committee
  (architect + security + code-review). The rubric can never override a failing test.
- **Gate on the project's own suite** (run in the workspace; the Verify agent independently re-runs from a clean state) — never benchmarks, never self-report.
- **Bounded retry + circuit breaker** — same error 3× → stop, root-cause, escalate. No infinite loops.

## The non-negotiable gates

1. Validate-before-build (GREENFIELD).  2. Plan freezes scope.  3. Human Feedback approval.
4. Builder ≠ Verifier.  5. Multi-expert review before deliver.
6. Literal delivery gate (`templates/delivery-gate.sh` exits 0).  7. Bounded retry + circuit breaker.

## Install

This repo **is** the skill. Put it where Claude Code finds skills:

```bash
git clone https://github.com/cskwork/supergoal-skill.git
# then either symlink or copy it into your global skills dir:
ln -s "$(pwd)/supergoal-skill" ~/.claude/skills/supergoal
# or: cp -R supergoal-skill ~/.claude/skills/supergoal
```

Then in Claude Code: `/supergoal <your objective>`.

## Layout

```
SKILL.md            thin spine: mode detection, gates, reference map
<<<<<<< HEAD
reference/          pipeline · experts · vault · market-research · quality-gates · debugging · qa · domain-rules
=======
reference/          pipeline · experts · vault · market-research · quality-gates · debugging · learn
>>>>>>> feat/learn-flow
reference/ui-ux.md  UI/UX overlay → taste-skill v2 (reference/taste-skill-v2.md, vendored) as design authority
learn/              LEARN-mode session journals (one file per session) + README template
templates/          delivery-gate.sh · validate-gate.sh · human-feedback-gate.mjs · state.json
DESIGN.md           research → decision mapping (cited)
docs/               research-brief.md · e2e-test-plan.md · changelog/ · index.html (landing)
examples/url-shortener/   a real service the harness built/debugged/extended, with harness-audit/
```

## Proof it works (live validation)

All three modes were run end-to-end on a real, production-grade service (a zero-dependency URL
shortener — see [`examples/url-shortener/`](examples/url-shortener/), 68 tests). The audit trail for
each run is in [`examples/url-shortener/docs/changelog/`](examples/url-shortener/docs/changelog/) (these early run records predate the file-set consolidation).

- **GREENFIELD** — the adversarial Verify caught **2 real SSRF bypasses** (`[::ffff:127.0.0.1]`,
  `localhost.`) and an unauth-500 that all passed the builder's own green tests, before shipping.
- **DEBUG** — given only a symptom ("hits undercount under load"), it reproduced (200 concurrent →
  1/200), root-caused a **lost-update race**, stopped at Human Feedback for approval, fixed, and re-verified
  with anti-flake concurrency runs (0 lost across 10 trials).
- **LEGACY** — added link-expiry (TTL) with **zero regressions** (backward-compatible with records
  that predate the field), committee-approved, gate-green.

Adversarial verification caught a real defect in 2 of 3 runs.

A separate evidence-only private-codebase benchmark compared plain Codex CLI, `/supergoal`, and
Codex Goal mode on the same hard backend task with the same hidden scorer. See
[`docs/experiments/2026-05-30-private-codebase-comparison/`](docs/experiments/2026-05-30-private-codebase-comparison/).

- **`/supergoal`** — passed all hidden checks, focused regressions, neighbor checks, `git diff --check`,
  and the delivery gate.
- **Codex Goal mode** — fixed the main code path and passed focused checks, but missed one hidden
  fallback/preservation coverage check.
- **Plain Codex CLI** — produced no usable result: idle run, no solution diff, no final output.

## Credit

Concept and workflow adapted from **oh-my-symphony** by cskwork
(https://github.com/cskwork/oh-my-symphony). Built for Claude Code.

## License

MIT — see [`LICENSE`](LICENSE).
