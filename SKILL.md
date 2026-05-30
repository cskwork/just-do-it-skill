---
name: supergoal
description: Run one objective through a gated build/debug/legacy workflow with expert subagents, Human Feedback approval before implementation, adversarial verification, and a delivery gate. Use for "/supergoal", "supergoal", "build X end to end", "fix this bug", or "add this feature".
argument-hint: "<objective: an app idea, a bug to fix, or a feature to add>"
level: 4
---

# /supergoal

One objective in, a verified result out. The skill is the **conductor**: it never writes
production code itself — it decomposes the objective, dispatches **expert subagents** through a
**forward-only pipeline**, and refuses to declare success until a **machine-checkable gate** passes.

The design is a set of gated lanes over a single shared vault, with an untrusted `claims.md`
re-verified by an adversary and a literal-bash delivery gate that is never edited to pass —
everything runs in-session with the `Task`/`Agent` tool, so there is nothing to install. (A plain
`git worktree` is still used as the clean-state sandbox for Verify and parallel Build — git is
already present.)

## Why this exists

A single agent given a big objective drifts: it skips validation, trusts its own "done", and leaves
unverified claims. `/supergoal` imposes the discipline a senior team would: validate before
building, separate the builder from the verifier, prove every claim by re-running it, and gate
delivery on evidence — not on the agent's own say-so.

## Use when

- "/supergoal build a habit-tracker app and ship it"
- "/supergoal the checkout page hangs intermittently in production — fix it"
- "/supergoal add SSO to our legacy Django monolith"
- The user hands off a whole objective and wants the full process run autonomously.

## Do NOT use when

- A single, well-scoped edit ("rename this variable") — do it directly.
- Pure brainstorming with no intent to build — use `brainstorming`.
- The user wants to drive each step themselves — use `ultrawork`.

## Step 0 — Mode detection (ALWAYS do this first)

Read the objective and classify it. State the detected mode to the user in one line before proceeding.

| Signal in the objective | Mode | Pipeline (see `reference/pipeline.md`) |
|---|---|---|
| "build / make / ship / launch a new app/product/site/tool" | **GREENFIELD** | Intake → **Validate** → Plan → **Human Feedback** → Build → Verify → QA → Deliver |
| "fix / broken / failing / crash / hang / regression / why does" | **DEBUG** | Intake → Reproduce → Diagnose → **Human Feedback** → Fix → Verify → Deliver |
| "add / integrate X into existing/legacy/our codebase" | **LEGACY** | Intake → Explore → Plan → **Human Feedback** → Build → Verify → QA → Deliver |

If ambiguous, ask ONE clarifying question, then proceed. Mode picks the pipeline; the gates and the
vault are identical across modes.

**Topology rule** (the research thesis — task shape, not preference, picks the architecture):
fan out parallel subagents only for *wide-and-shallow* work (Validate research, scaffolding several
modules). Keep a *single driving agent* for *deep-and-narrow* work — so **DEBUG and LEGACY default to
single-driver** with isolated helpers only for independent probes. **All modes require Human
Feedback approval before the first implementation write**. Details in `reference/pipeline.md`.

**Domain routing** (advisory): right after mode detection, route the objective through the
`ten-rules` skill and distill **≤10 abstract priority rules** for the detected domain(s). Record them
once in the run's `README.md` (`## Priority Rules`) and carry them into every phase. They shape
Plan/Build/Review quality; they never replace or override the hard gates. Mechanism:
`reference/domain-rules.md`.

**UI/UX overlay**: if the objective ships user-facing visual UI (landing page, redesign, "make it
look good", frontend look-and-feel), load `reference/ui-ux.md` — it makes the vendored taste-skill v2
(`reference/taste-skill-v2.md`) the design authority and adds a Designer role + a pre-flight QA gate.
Loaded on demand only; modes and gates are unchanged.

## The non-negotiable gates

These are the spine. Never weaken or skip them; never edit a gate to make it pass
(`reference/quality-gates.md`).

1. **Validate-before-build** (GREENFIELD): Build won't open until `templates/validate-gate.sh <vault>` exits 0 (requires `Decision: GO` in `brief.md`). Details: `reference/quality-gates.md`.
2. **Plan freezes scope**: `plan.md` is written once and frozen; Build/Fix implements it, does not redesign.
3. **Human Feedback before implementation**: after the brief, reproduction/diagnosis, and plan are ready, pause for explicit human approval. `plan.md` must contain a top plain-language brief and a lower technical novice-dev brief; `templates/human-feedback-gate.mjs <vault> <Build|Fix>` must pass before Build/Fix opens.
4. **Builder ≠ Verifier**: the agent that writes code does not get to approve it. A fresh **adversarial
   Verify** agent re-runs every `run-to-prove` command in `claims.md` from a clean state — a fresh
   `git worktree` at the build commit, never the builder's dirty tree.
5. **Multi-expert review before deliver**: architect + security-reviewer + code-reviewer run in parallel; ALL must approve (`reference/experts.md`).
6. **Literal delivery gate**: `templates/delivery-gate.sh` must exit 0 — required artifacts present, aggregate `verdict: GREEN`, `Decision: GO` for greenfield, project tests pass. Skill cannot announce "done" otherwise.
7. **Bounded retry + circuit breaker**: max 5 fix cycles per phase; the same normalized error signature 3x trips `templates/circuit-breaker.mjs` → stop, root-cause to user. Mechanism: `reference/vault.md`.

## The vault (only cross-phase state)

Every run creates `docs/changelog/<date>-<slug>/` in the target repo — the single blackboard every
phase reads from and writes to, committed as the run's permanent changelog. Phases run as fresh
subagent contexts, so the vault is how they communicate. Full contract in `reference/vault.md`.
Six files: `README.md`, `brief.md`, `plan.md`, `claims.md`, `verification.md`, `state.json`. Per-file contracts: `reference/vault.md`.

## Expert roster

Roles are dispatched as subagents, each a fresh context with the minimum vault read-set. Verifier is `allowedTools`-scoped to `claims.md` + source only (`reference/experts.md`). See `reference/experts.md` for the full dispatch table, parallel-wave rules, and agent types. UI/UX jobs add a **Designer** role bound to `reference/taste-skill-v2.md` (see `reference/ui-ux.md`).

## Reference map (progressive disclosure — load only what the current phase needs)

| Read this | When |
|---|---|
| `reference/pipeline.md` | Always — the phase definitions and exit gates for the detected mode |
| `reference/experts.md` | When dispatching any phase — role → agent-type → model-tier map |
| `reference/vault.md` | At Intake (create vault) and whenever a phase passes state |
| `reference/domain-rules.md` | At Intake — route the objective to its `ten-rules` domain(s); distill the ≤10 priority rules carried through the run |
| `reference/market-research.md` | GREENFIELD Validate phase — demand-validation methods |
| `reference/quality-gates.md` | Verify, Review, and Deliver phases — what "production-ready" means |
| `reference/debugging.md` | DEBUG mode Diagnose phase — runs the `diagnose` skill's feedback-loop method |
| `reference/qa.md` | QA phase — drive the running web/CLI app (agent-browser via subagent), record as-is/to-be evidence |
| `reference/ui-ux.md` | When the objective ships visual UI — the taste-skill v2 overlay (Plan/Build/QA) |
| `reference/taste-skill-v2.md` | Designer Build + QA pre-flight on UI/UX jobs — vendored design authority (large; load only then) |

### Template scripts (referenced by the gates above)

| Script | Gate |
|---|---|
| `templates/delivery-gate.sh` | Deliver — hard exit-0 check for artifacts + tests |
| `templates/validate-gate.sh <vault>` | GREENFIELD Validate — machine-checks `Decision: GO` in `brief.md` before Build opens |
| `templates/human-feedback-gate.mjs <vault> <Build\|Fix>` | Human Feedback — checks the two approval briefs and recorded human approval before Build/Fix opens |
| `templates/circuit-breaker.mjs <state.json> <sig>` | Each failed fix cycle — trips at 3 identical normalized error signatures |

## Escalation & stop conditions

- Circuit breaker tripped (`circuit-breaker.mjs` exits 1) → stop, root-cause to user.
- Validate phase finds no demand evidence (GREENFIELD) → stop, report; do not build on spec.
- Human rejects or changes the plan → do not Build/Fix; re-open Plan/Diagnose, update the vault, and ask again.
- Delivery gate cannot pass after fixes → report exactly which check fails; never fake the gate.
- Destructive or irreversible step needed (drop data, force-push, external publish) → ask first.

## Final checklist (before claiming done)

- [ ] Mode stated and correct pipeline run
- [ ] Human Feedback stage produced the plain-language and technical briefs, and approval was recorded before Build/Fix
- [ ] Every `claims.md` entry has a GREEN verdict in `verification.md` from the adversarial pass
- [ ] architect + security + code-review all approved
- [ ] `delivery-gate.sh` exited 0 — paste the output as evidence
- [ ] the run's `README.md` captures the key choices and any escalations
- [ ] Reported what was verified, with command output — no unverified "done"
