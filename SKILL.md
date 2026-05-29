---
name: just-do-it
description: One command that takes a single objective through a full, gated development process using expert subagents. Use when the user types "/just-do-it", says "just do it", "build me X end to end", "take this from idea to shipped", or hands off a whole objective for autonomous delivery. Three modes — GREENFIELD (ship a new production-grade app, with market/demand validation up front), DEBUG (root-cause a complex bug in web or other software), LEGACY (add a feature inside a large/legacy codebase). Borrows oh-my-symphony's gated-lane + shared-vault + adversarial-verify + literal-delivery-gate model, runs it self-contained with in-session subagents — no external orchestrator, TUI, or CLI install.
argument-hint: "<objective: an app idea, a bug to fix, or a feature to add>"
level: 4
---

# /just-do-it

One objective in, a verified result out. The skill is the **conductor**: it never writes
production code itself — it decomposes the objective, dispatches **expert subagents** through a
**forward-only pipeline**, and refuses to declare success until a **machine-checkable gate** passes.

The design is borrowed from `oh-my-symphony` (gated lanes, a single shared vault, untrusted
`claims.md` re-verified by an adversary, a literal-bash delivery gate that is never edited to pass)
but stripped of the heavy Symphony CLI / TUI / worktree infrastructure — everything runs in-session
with the `Task`/`Agent` tool, so there is nothing to install.

## Why this exists

A single agent given a big objective drifts: it skips validation, trusts its own "done", and leaves
unverified claims. `/just-do-it` imposes the discipline a senior team would: validate before
building, separate the builder from the verifier, prove every claim by re-running it, and gate
delivery on evidence — not on the agent's own say-so.

## Use when

- "/just-do-it build a habit-tracker app and ship it"
- "/just-do-it the checkout page hangs intermittently in production — fix it"
- "/just-do-it add SSO to our legacy Django monolith"
- The user hands off a whole objective and wants the full process run autonomously.

## Do NOT use when

- A single, well-scoped edit ("rename this variable") — just do it directly.
- Pure brainstorming with no intent to build — use `brainstorming`.
- The user wants to drive each step themselves — use `ultrawork` / `using-symphony`.

## Step 0 — Mode detection (ALWAYS do this first)

Read the objective and classify it. State the detected mode to the user in one line before proceeding.

| Signal in the objective | Mode | Pipeline (see `reference/pipeline.md`) |
|---|---|---|
| "build / make / ship / launch a new app/product/site/tool" | **GREENFIELD** | Intake → **Validate** → Plan → Build → Verify → QA → Deliver |
| "fix / broken / failing / crash / hang / regression / why does" | **DEBUG** | Intake → Reproduce → Diagnose → Fix → Verify → Deliver |
| "add / integrate X into existing/legacy/our codebase" | **LEGACY** | Intake → Explore → Plan → Build → Verify → QA → Deliver |

If ambiguous, ask ONE clarifying question, then proceed. Mode picks the pipeline; the gates and the
vault are identical across modes.

**Topology rule** (the research thesis — task shape, not preference, picks the architecture):
fan out parallel subagents only for *wide-and-shallow* work (Validate research, scaffolding several
modules). Keep a *single driving agent* for *deep-and-narrow* work — so **DEBUG and LEGACY default to
single-driver** with isolated helpers only for independent probes, and both open in **read-only Plan
Mode with human approval before the first write**. Details in `reference/pipeline.md`.

## The non-negotiable gates

These are the spine. Never weaken or skip them; never edit a gate to make it pass
(`reference/quality-gates.md`).

1. **Validate-before-build** (GREENFIELD): Build won't open until `templates/validate-gate.sh <vault>` exits 0 (requires `Decision: GO` in `brief.md`). Details: `reference/quality-gates.md`.
2. **Plan freezes scope**: `plan.md` is written once and frozen; Build implements it, does not redesign.
3. **Builder ≠ Verifier**: the agent that writes code does not get to approve it. A fresh **adversarial
   Verify** agent re-runs every `run-to-prove` command in `claims.md` from a clean state.
4. **Multi-expert review before deliver**: architect + security-reviewer + code-reviewer run in parallel; ALL must approve (`reference/experts.md`).
5. **Literal delivery gate**: `templates/delivery-gate.sh` must exit 0 — required artifacts present, aggregate `verdict: GREEN`, `Decision: GO` for greenfield, project tests pass. Skill cannot announce "done" otherwise.
6. **Bounded retry + circuit breaker**: max 5 fix cycles per phase; the same normalized error signature 3x trips `templates/circuit-breaker.mjs` → stop, root-cause to user. Mechanism: `reference/vault.md`.

## The vault (only cross-phase state)

Every run creates `docs/changelog/<date>-<slug>/` in the target repo — the single blackboard every
phase reads from and writes to, committed as the run's permanent changelog. Phases run as fresh
subagent contexts, so the vault is how they communicate. Full contract in `reference/vault.md`.
Six files: `README.md`, `brief.md`, `plan.md`, `claims.md`, `verification.md`, `state.json`. Per-file contracts: `reference/vault.md`.

## Expert roster

Roles are dispatched as subagents, each a fresh context with the minimum vault read-set. Verifier is `allowedTools`-scoped to `claims.md` + source only (`reference/experts.md`). See `reference/experts.md` for the full dispatch table, parallel-wave rules, and agent types.

## Reference map (progressive disclosure — load only what the current phase needs)

| Read this | When |
|---|---|
| `reference/pipeline.md` | Always — the phase definitions and exit gates for the detected mode |
| `reference/experts.md` | When dispatching any phase — role → agent-type → model-tier map |
| `reference/vault.md` | At Intake (create vault) and whenever a phase passes state |
| `reference/market-research.md` | GREENFIELD Validate phase — demand-validation methods |
| `reference/quality-gates.md` | Verify, Review, and Deliver phases — what "production-ready" means |
| `reference/debugging.md` | DEBUG mode Diagnose phase — hypothesis-driven root-cause method |

### Template scripts (referenced by the gates above)

| Script | Gate |
|---|---|
| `templates/delivery-gate.sh` | Deliver — hard exit-0 check for artifacts + tests |
| `templates/validate-gate.sh <vault>` | GREENFIELD Validate — machine-checks `Decision: GO` in `brief.md` before Build opens |
| `templates/circuit-breaker.mjs <state.json> <sig>` | Each failed fix cycle — trips at 3 identical normalized error signatures |

## Escalation & stop conditions

- Circuit breaker tripped (`circuit-breaker.mjs` exits 1) → stop, root-cause to user.
- Validate phase finds no demand evidence (GREENFIELD) → stop, report; do not build on spec.
- Delivery gate cannot pass after fixes → report exactly which check fails; never fake the gate.
- Destructive or irreversible step needed (drop data, force-push, external publish) → ask first.

## Final checklist (before claiming done)

- [ ] Mode stated and correct pipeline run
- [ ] Every `claims.md` entry has a GREEN verdict in `verification.md` from the adversarial pass
- [ ] architect + security + code-review all approved
- [ ] `delivery-gate.sh` exited 0 — paste the output as evidence
- [ ] the run's `README.md` captures the key choices and any escalations
- [ ] Reported what was verified, with command output — no unverified "done"
