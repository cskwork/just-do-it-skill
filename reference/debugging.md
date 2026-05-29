# Debugging — DEBUG mode method

Root-causing one bug is **deep-and-narrow** work: it demands a single coherent mental model held
across the whole reasoning chain. Multi-agent isolation breaks that shared model, so **DEBUG defaults
to a single driving agent** (`debugger`/`tracer`, Opus), spawning isolated helper subagents only for
genuinely independent probes — e.g. "grep this log corpus" while "reproduce in env B" — each
returning a summary to the vault (Cognition single-agent guidance; LangChain task-topology framing).

This is the disciplined loop the existing `systematic-debugging` / `diagnose` skills also enforce —
reuse them; this file is the DEBUG-mode contract.

## Open in read-only Plan Mode

Analyze and propose **without mutating** through Reproduce + Diagnose. Speculative edits corrupt the
repro state and destroy the evidence. Get the user's approval on the fix plan before the first write
(antstack.com; developersdigest.tech Plan Mode guidance).

## The loop

1. **Reproduce (red first).** Build a deterministic, *failing* reproduction — ideally a test, else a
   scripted repro — that fails on current code **in a clean sandbox**. No repro → no fix; an
   intermittent bug needs its nondeterminism pinned first. Record the `run-to-prove` in `claims.md`.
2. **Localize.** Narrow to the smallest code region. `git bisect` to find the introducing commit when
   it's a regression; binary-search the input/state space; add instrumentation/logging rather than
   guessing.
3. **Hypothesize (compete).** Write 2-3 candidate root causes to `decisions.log`, each with the
   evidence **for and against**. Track uncertainty explicitly. Pick the next probe that best
   discriminates between them — don't tunnel on the first idea (the `tracer` agent's method).
4. **Confirm.** One hypothesis must be backed by direct evidence (a log line, a failing assertion at
   the exact boundary), not plausibility. Then get fix-plan approval.
5. **Fix at the root.** Smallest change that addresses the cause — not the symptom. No silencing
   errors, no fake success paths, no broad refactor riding along (project rule 7).
6. **Verify + regression review.** The previously-failing repro now **passes** in a clean sandbox AND
   the full suite stays green. Then a committee re-checks the fix didn't break correctness / security
   / behavior elsewhere (arxiv 2511.16708). This failing-before → passing-after in a clean sandbox is
   the **literal delivery gate for DEBUG** (arxiv 2509.16941; Anthropic verification practice).

## Circuit breaker

Same error signature 3× → STOP. Write what was tried and the leading hypothesis to `decisions.log`
and escalate to the user with the evidence. Thrashing on a wrong model wastes the most tokens of any
failure mode; bound it.

## Persist everything to the vault

Every probe result goes to `decisions.log` so a re-run or follow-up never re-investigates solved
ground (shared-blackboard finding, arxiv 2510.01285). Full isolation that discards findings forces
redundant rework — the vault is what prevents it.
