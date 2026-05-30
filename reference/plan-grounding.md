# Plan grounding — agent-run, before the plan freezes

Between Plan and Human Feedback, the planner grounds `plan.md` against the project's own domain and
architecture. The grill Q&A is **answered by the planner itself**, choosing the optimal option from
the docs it explored — NOT asked of the human. The human's single approval is the later Human
Feedback gate (gate 3), unchanged. Grounding sharpens the plan; it never replaces a gate.

Pick the track by objective type. Source skills, if installed, are `grill-with-docs` (Track A) and
`improve-codebase-architecture` (Track B); this file is the self-contained contract so neither needs
to be installed.

## Track A — feature / novel work (GREENFIELD, LEGACY feature): self-grill the docs

1. **Locate the domain docs** (during Validate/Explore): `CONTEXT.md` (the glossary; a root
   `CONTEXT-MAP.md` means multiple contexts, each with its own `CONTEXT.md`), `docs/adr/` (settled
   decisions — do NOT re-litigate), plus `brief.md` and the Explore map.
2. **Walk every branch of the design tree.** For each open question, answer it yourself with the
   optimal option and justify it from the explored docs/code. Escalate to a real human question only
   when the docs genuinely cannot decide AND the choice is load-bearing.
3. **Sharpen language.** When a term is vague, overloaded, or conflicts with the glossary, pick the
   precise canonical term and resolve it. Cross-check every "how it works" claim against the code;
   when code and plan disagree, surface it and resolve it in the plan.
4. **Update docs inline** as decisions crystallize: add resolved terms to `CONTEXT.md` (glossary
   only — no implementation detail; create it lazily if absent). Record an ADR only when the decision
   is hard to reverse AND surprising without context AND a real trade-off; otherwise skip.
5. Write the resolved choices + term definitions into `plan.md` so Human Feedback reviews a
   domain-grounded plan.

## Track B — refactor / "improve codebase" work (no new feature): deepening opportunities

Vocabulary (use exactly): **Module** = interface + implementation. **Interface** = everything a
caller must know (types, invariants, error modes, ordering, config). **Depth** = leverage behind a
small interface — *deep* = high leverage, *shallow* = interface nearly as complex as the
implementation. **Seam** = where an interface lives, alterable without editing in place. **Leverage**
= what callers gain; **Locality** = change, bugs, and knowledge concentrated in one place.

1. Read `CONTEXT.md` + the relevant ADRs first — they name good seams and record settled decisions.
2. **Explore for friction:** concepts that require bouncing across many small modules; shallow
   modules; pure functions extracted only for testability while the real bugs hide at the call sites
   (no locality); modules leaking across their seams; code untestable through its current interface.
3. **Deletion test** on anything suspected shallow: would deleting it concentrate complexity (it
   earns its keep) or merely move it (pass-through)? "Concentrates" is a real deepening candidate.
4. Rank candidates by leverage. For the top picks, self-grill the design tree (what sits behind the
   seam, what tests survive). One adapter = a hypothetical seam; two adapters = a real seam.
5. Write the chosen deepenings into `plan.md` (files, problem, solution, benefit in locality/leverage
   terms) using `CONTEXT.md` vocabulary. If a candidate contradicts an ADR, surface it only when the
   friction warrants reopening the ADR — and mark it as such.

## Exit

`plan.md` is now domain-grounded. It freezes (gate 2: plan-hash recorded) and enters **Human
Feedback** (gate 3) exactly as before.
