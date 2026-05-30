# Experts — roles, dispatch, model tiers

The skill is the **orchestrator**. It does not write production code; it dispatches role-scoped
subagents and ingests only their **compressed summaries** (never raw transcripts) — the converged
2026 pattern (Anthropic multi-agent research system; LangChain; flowhunt.io). Each subagent runs in
a **fresh context** with a **locked role prompt** and reads only its allowed vault files, so a critic
never inherits the coder's rationalizations (arxiv 2507.19902 AgentMesh; arxiv 2506.17208).

## Role → agent type → model tier

Use the existing project agent types via the `Task`/`Agent` tool. Pin the model per role for
predictable cost (token spend explains ~80% of multi-agent performance variance — Anthropic).

| Role | agent type | Model tier | Reads (vault) | Produces |
|---|---|---|---|---|
| Analyst (Intake/Validate) | `analyst` | Opus | objective | `brief.md` (incl. `## Validation`) |
| Architect (Plan/Explore) | `architect` | Opus | brief, README map | `plan.md` (incl. architecture + contracts) |
| Builder | `executor` | Sonnet (Opus if novel/algorithmic) | plan | code + `claims.md` entry |
| Designer (UI/UX jobs only) | `designer` | Sonnet | `plan.md` + `reference/taste-skill-v2.md` | UI code to taste-skill v2 rules + dial values; `claims.md` entry |
| Verifier (adversary) | `verifier` / `critic` | Opus | `claims.md` + source only (harness-enforced — see below) | `verification.md` verdicts |
| Completeness critic | `critic` | Opus | required-coverage list + code (NOT `claims.md` rationale) | gaps → new REDs / justified `Not covered:` entries |
| Security reviewer | `security-reviewer` | Sonnet | diff | findings |
| Code reviewer | `code-reviewer` | Sonnet | diff + `plan.md` | findings |
| QA | `qa-tester` | Sonnet | running app | `verification.md` (`## QA`) + `qa/` evidence (drives the app with agent-browser — `reference/qa.md`) |
| Debugger (DEBUG mode) | `debugger` / `tracer` | Opus | repo, repro | root cause to `README.md` |

**Verifier read-scope isolation** is harness-enforced: dispatch the Verifier subagent with
`allowedTools` (or an equivalent read-allowlist) restricted to `claims.md` and the source paths
listed there. `plan.md` and `brief.md` must not be in the allowlist. Instruction-only isolation is
insufficient — a subagent can read any file it can reach unless the harness blocks it.

**Completeness critic & diverse verifier panel.** After per-claim Verify, dispatch a fresh
`completeness-critic` against the required-coverage list (brief acceptance criteria + domain checklist —
`reference/quality-gates.md`) to name what is NOT covered; each gap is a new RED or a justified
`Not covered:` entry. For **high-severity** claims (security / data-loss / concurrency / auth), replace
the single verifier with a **≥3-verifier panel of distinct lenses** (correctness / security / repro) and
take majority RED → RED. Diverse lenses beat redundant same-lens votes; cost-gate the panel to
high-severity claims only.

Architect/editor split inside Build (Aider architect-mode evidence, directional): the architect
produces the diff intent / plan, the executor emits the actual edits. A reasoning pass plans, a
precise pass writes. On **UI/UX jobs** (`reference/ui-ux.md`) the Designer replaces/augments the
editor for visual surfaces, and the QA gate adds the taste-skill v2 Pre-Flight Check (§14); the
committee and adversarial Verify are unchanged — the Designer never self-approves.

Plan grounding (Architect, Plan phase): before freezing `plan.md`, the Architect self-runs the
grounding pass — a `grill-with-docs`-style self-grill for feature work, an
`improve-codebase-architecture`-style deepening pass for refactor objectives — and **answers each
challenge itself** from the explored docs (`CONTEXT.md`, ADRs, `brief.md`, the map), never by asking
the human. The human's single approval stays the later Human Feedback gate. Method:
`reference/plan-grounding.md`.

## Parallel-wave dispatch (from ultrawork)

1. Classify tasks by independence; build a dependency matrix.
2. Fire all **independent** tasks in the same wave simultaneously (one message, multiple `Task`
   calls). Sequence only true dependents.
3. Use `run_in_background: true` for any op > ~30s (installs, builds, full test runs).
4. **Gate fan-out behind the topology rule** (`pipeline.md`): only wide-and-shallow work fans out.
   DEBUG / LEGACY feature work stays single-driver with isolated helpers for independent probes.
5. **Isolate parallel writers in a `git worktree`** — each fanned-out Build slice (and the adversarial
   Verify) runs in its own `git worktree` off the build commit so concurrent edits never collide and
   the Verifier re-runs from a genuinely clean tree. No install; remove the worktree when the wave ends.

## The committee gate (before Deliver)

Spawn reviewers in parallel, each with a **distinct mandate** — a diverse committee finds more
defects than one generic reviewer (arxiv 2511.16708 Codex-Verify; arxiv 2506.17208):

- `architect` → does it match `plan.md` + sound structure / maintainability?
- `security-reviewer` → OWASP, secrets, unsafe patterns?
- `code-reviewer` → correctness, tests, style, dead code?

ALL must approve. This is the **soft gate** — it scores quality/security but **can never override a
failing hard test** (`quality-gates.md`). Each reviewer also checks the diff against the run's
`## Priority Rules` (advisory — violations are findings, not a hard fail; `domain-rules.md`).

## Locked-prompt template (give every dispatched subagent)

```
ROLE: <role>. You run in isolation; you cannot see other agents' transcripts.
READ ONLY THESE VAULT FILES: <list>.   (do not read beyond your scope)
DO: <the one job>.
RULES: <role-relevant Priority Rules lines the conductor injects — advisory; omit for the Verifier>.
WRITE: <exact vault file(s) to append/update>.
RETURN: a compressed summary (decisions + evidence + file:line), NOT your transcript.
GATE: <the machine-checkable exit condition for this phase>.
```

## Anti-patterns (banned)

- Open-ended N-round debate / GroupChat loops that multiply tokens without a bounded gate
  (AutoGen-style) — use graph-style handoffs with checkpoints instead.
- A subagent reading the whole vault "just in case" — breaks role separation and inflates cost.
- The builder approving its own work — only a fresh Verifier sets a GREEN verdict.
