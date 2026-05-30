# LEARN mode — teach the user, don't change code

For "explain X" / "understand Y" / "teach me Z" — a codebase area or a general concept. No production code is written. **Done = the user can define every key term and explain the idea back, unaided.** Not "I explained it."

LEARN skips Validate/Build/Verify/QA/Deliver and the implementation gates. It runs its own flow and journals to `learn/`.

## Flow

`Intake -> Source -> Bridge -> Teach loop -> Check -> Journal`

1. **Source.** Gather before teaching; no guessing.
   - Codebase topic: dispatch `explore`/`architect` (read-only) to map files, symbols, and the call flow.
   - General concept: research authoritative sources.
2. **Bridge (mandatory).** Ask what the user already knows. Connect the unfamiliar domain to *their* language/world with one concrete analogy. The bridge always precedes the jargon — never teach term-first. This is the link between the user's language and the unfamiliar domain.
3. **Teach loop** — Feynman + Socratic, run via the `grill-me` skill:
   - Explain in plain words. Every jargon term gets a one-line definition on first use.
   - Don't lecture — ask back. One question at a time; follow each branch of the decision tree until that node is resolved.
   - The user's answers expose gaps; fill them, then re-ask.
4. **Check (the gate).** The user restates each key term and the whole idea in their own words, unaided. Gaps -> return to step 3. Mastered only when they pass — this is LEARN's delivery gate.
5. **Journal (live, during the session).** Append to `learn/<topic>-YYYY-MM-DD.md` as you go: the question, the bridge/analogy, key terms + plain definitions, the user's own explanation, open questions. Create `learn/` if missing. Format: `learn/README.md`.

## Principles

- A term is "known" only when the user can define it back in plain language.
- Connect to the user's existing vocabulary first; introduce domain vocabulary second.
- Serve both audiences: a non-technical user gets analogies from their own domain; a technical user gets analogies from systems they already know.
- Never dump a lecture. The loop is question-driven.
