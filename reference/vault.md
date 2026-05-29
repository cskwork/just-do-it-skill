# Vault — the only cross-phase state

Every run creates `./.just-do-it/<slug>/` in the target repo. Because each phase runs as a fresh
subagent context, the vault is the **single blackboard** they communicate through (oh-my-symphony
`vault.md`; persistent-memory finding arxiv 2510.01285 — shared blackboard yields 13-57% gains and
stops discoveries being lost at task boundaries).

`<slug>` = kebab-case of the objective. Add `./.just-do-it/` to `.gitignore` (the skill does this at
Intake) so vault scratch never pollutes the repo; the final commit carries only real code.

## Files

| File | Written by | Mutability | Purpose |
|---|---|---|---|
| `state.json` | orchestrator | live | mode, current phase, cycle counters, error signatures, GO/NO-GO. See `templates/state.json` |
| `brief.md` | Analyst | frozen after Intake | goal, audience, acceptance criteria, non-goals |
| `validation.md` | Analyst | frozen after Validate | demand evidence + GO/NO-GO (GREENFIELD only) |
| `plan.md` | Architect | **frozen after Plan** | task table of slices, each with an acceptance check |
| `architecture.md` | Architect | living | stack, structure, codebase map (LEGACY) |
| `contracts.md` | Architect | living | interfaces/API shapes each slice owns |
| `claims.md` | Builder | **append-only, UNTRUSTED** | one entry per slice: what was done + a `run-to-prove` command |
| `verification.md` | Verifier | append-only | per-claim `verdict: GREEN\|RED` + evidence |
| `qa-report.md` | QA | append-only | black-box results, screenshots/log refs |
| `decisions.log` | any | append-only | key choices, hypotheses, skips, escalations (the audit trail) |

## Two rules that make the vault trustworthy

1. **`claims.md` is untrusted.** The Builder asserts; it does not prove. Only the Verifier — a fresh
   adversarial context that re-runs each `run-to-prove` from a clean state — writes a verdict
   (oh-my-symphony "honesty about claims"). A self-reported "done" is never sufficient.
2. **Frozen files are frozen.** `plan.md` is written once; Build implements it, does not redesign it.
   Scope creep mid-build is the most common drift; freezing kills it.

## `claims.md` entry format

```
## CLAIM <slice-id>
what: <one line — what this slice implements>
files: <paths touched>
run-to-prove: <exact shell command that exits 0 iff the claim holds, e.g. `npm test -- auth.spec`>
expected: <what a passing run prints>
```

## Resumption

On re-invocation with the same objective, read `state.json` → resume at `current_phase` (don't
redo completed phases). The vault + git history reconstruct everything; no in-memory state needed.
This mirrors oh-my-symphony's per-turn `wip:` snapshot resilience without needing the Symphony service.
