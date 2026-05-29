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
| Analyst (Intake/Validate) | `analyst` | Opus | objective | `brief.md`, `validation.md` |
| Architect (Plan/Explore) | `architect` | Opus | brief, validation, map | `plan.md`, `architecture.md` |
| Builder | `executor` | Sonnet (Opus if novel/algorithmic) | plan, contracts | code + `claims.md` entry |
| Verifier (adversary) | `verifier` / `critic` | Opus | `claims.md` + code only | `verification.md` verdicts |
| Security reviewer | `security-reviewer` | Sonnet | diff | findings |
| Code reviewer | `code-reviewer` | Sonnet | diff + `plan.md` | findings |
| QA | `qa-tester` | Sonnet | running app | `qa-report.md` |
| Debugger (DEBUG mode) | `debugger` / `tracer` | Opus | repo, repro | root cause to `decisions.log` |

Architect/editor split inside Build (Aider architect-mode evidence, directional): the architect
produces the diff intent / plan, the executor emits the actual edits. A reasoning pass plans, a
precise pass writes.

## Parallel-wave dispatch (from ultrawork)

1. Classify tasks by independence; build a dependency matrix.
2. Fire all **independent** tasks in the same wave simultaneously (one message, multiple `Task`
   calls). Sequence only true dependents.
3. Use `run_in_background: true` for any op > ~30s (installs, builds, full test runs).
4. **Gate fan-out behind the topology rule** (`pipeline.md`): only wide-and-shallow work fans out.
   DEBUG / LEGACY feature work stays single-driver with isolated helpers for independent probes.

## The committee gate (before Deliver)

Spawn reviewers in parallel, each with a **distinct mandate** — a diverse committee finds more
defects than one generic reviewer (arxiv 2511.16708 Codex-Verify; arxiv 2506.17208):

- `architect` → does it match `plan.md` + sound structure / maintainability?
- `security-reviewer` → OWASP, secrets, unsafe patterns?
- `code-reviewer` → correctness, tests, style, dead code?

ALL must approve. This is the **soft gate** — it scores quality/security but **can never override a
failing hard test** (`quality-gates.md`).

## Locked-prompt template (give every dispatched subagent)

```
ROLE: <role>. You run in isolation; you cannot see other agents' transcripts.
READ ONLY THESE VAULT FILES: <list>.   (do not read beyond your scope)
DO: <the one job>.
WRITE: <exact vault file(s) to append/update>.
RETURN: a compressed summary (decisions + evidence + file:line), NOT your transcript.
GATE: <the machine-checkable exit condition for this phase>.
```

## Anti-patterns (banned)

- Open-ended N-round debate / GroupChat loops that multiply tokens without a bounded gate
  (AutoGen-style) — use graph-style handoffs with checkpoints instead.
- A subagent reading the whole vault "just in case" — breaks role separation and inflates cost.
- The builder approving its own work — only a fresh Verifier sets a GREEN verdict.
