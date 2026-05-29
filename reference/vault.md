# Vault — the only cross-phase state

Every run creates a folder under the target repo's changelog: **`docs/changelog/<date>-<slug>/`**
(e.g. `docs/changelog/2026-05-30-add-sso/`). Because each phase runs as a fresh subagent context, this
folder is the **single blackboard** they communicate through (oh-my-symphony `vault.md`; shared-
blackboard finding arxiv 2510.01285 — 13-57% gains, stops discoveries being lost at task boundaries).

Unlike a hidden scratch dir, the vault **is the run's permanent, browsable changelog** — it is
committed with the code, so every project the harness touches gets a tracked decision record (matches
the "write reasoning to a dated changelog" house rule). `<slug>` = kebab-case of the objective;
`<date>` = ISO date. If the target has no `docs/`, create it.

## Files (6 — kept deliberately small)

Files are merged wherever it does not break **read-scope** (a subagent reads only its slice). The
three that stay separate are load-bearing for builder ≠ verifier; the rest are consolidated.

| File | Written by | Mutability | Holds |
|---|---|---|---|
| `README.md` | any (orchestrator owns) | append-only | the run narrative + decisions, hypotheses, skips, escalations — the **audit log** and the folder's rendered index |
| `brief.md` | Analyst | frozen per section | goal, audience, acceptance criteria, non-goals + a **`## Validation`** section (demand evidence ending in one `Decision: GO`/`Decision: NO-GO` line — greenfield) |
| `plan.md` | Architect (DEBUG: from Diagnose) | **frozen once written** | the slice plan with per-slice acceptance checks, plus **Architecture** and **Contracts** sections (stack, codebase map, interfaces). DEBUG: the approved root-cause + fix plan. **Required by the gate in every mode.** |
| `claims.md` | Builder | **append-only, UNTRUSTED** | one entry per slice: what was done + a `run-to-prove` command |
| `verification.md` | Verifier (+ QA) | append-only | per-claim lines `claim <id>: GREEN\|RED` + evidence, then ONE aggregate `verdict: GREEN` (or `verdict: RED`); plus a **`## QA`** section with black-box results. The gate reads the aggregate; on re-verify, rewrite so no line-start `verdict: RED` lingers |
| `state.json` | orchestrator | live (machine) | mode, current phase, per-phase cycle counters, error signatures, `go_decision`, `plan_hash`, `approval`, `circuit_breaker_threshold`. See `templates/state.json` and field docs below. |

Merged in (no information lost): `validation.md` → brief's `## Validation`; `architecture.md` +
`contracts.md` → plan sections; `qa-report.md` → verification's `## QA`; `decisions.log` → `README.md`.

## `state.json` field reference

### `cycles`
A fixed-key object covering all phases (one source of truth across modes — keys do NOT vary by mode):

```json
"cycles": {
  "intake": 0, "validate": 0, "plan": 0, "build": 0,
  "verify": 0, "qa": 0, "deliver": 0,
  "reproduce": 0, "diagnose": 0, "fix": 0, "explore": 0
}
```

Increment the relevant key on each rewind into that phase. Phases not used by the active mode stay at 0.

### `error_signatures`
A map from normalized error signature → integer count, managed by `templates/circuit-breaker.mjs`.

**Normalization rule**: take the first failing assertion message + `file:line` from the stack trace,
lowercase it, and strip everything after the first `at ` frame (stack-trim). This produces a stable,
short key across runs regardless of transient output noise.

```json
"error_signatures": {
  "assertionerror: expected 200 but got 401 auth.spec.ts:42": 2
}
```

`circuit_breaker_threshold` (default `3`): when a signature count reaches this value,
`circuit-breaker.mjs` exits 1 (TRIP) and the orchestrator halts the fix loop.

### `plan_hash`
Recorded by the orchestrator on Plan phase exit: `shasum -a 256 plan.md` stored as a hex string.
Before Deliver opens, the orchestrator re-hashes `plan.md` and compares. A mismatch **fails the
gate** unless `README.md` contains a logged re-plan step (keyword: `RE-PLAN:`).

```json
"plan_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4da..."
```

### `approval`
`null` until a human explicitly approves the fix/build plan (required before the first source-tree
write in DEBUG and LEGACY modes). Once set, the canonical shape is:

```json
"approval": { "phase": "<phase-name>", "status": "APPROVED" }
```

No source-tree write occurs while `approval` is `null`. The field name is fixed — do not use
ad-hoc variants (`approval_to_build`, `approval_to_fix`, etc.).

---

## Two rules that make the vault trustworthy

1. **`claims.md` is untrusted.** The Builder asserts; it does not prove. Only the Verifier — a fresh
   adversarial context that reads **only `claims.md` + the code** and re-runs each `run-to-prove` from
   a clean state — writes a verdict. A self-reported "done" is never sufficient. (This is why
   `claims.md` and `verification.md` stay separate from `plan.md`/`brief.md`: the Verifier must not
   see the plan's rationale.)
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

On re-invocation with the same objective, read `state.json` → resume at `current_phase` (don't redo
completed phases). The vault folder + git history reconstruct everything; no in-memory state needed.
