# 2026-05-31 - Plan grounding cherry-pick recovery

## Decision

Resolve the `75ae012` cherry-pick by keeping the `reference/plan-grounding.md` reference-map entry
in `SKILL.md`, and restore the deleted `feat/supergoal-plan-grounding` branch ref to that commit.

## Reasoning

- The incoming change adds Plan-phase grounding documentation and wiring, so the reference map must
  expose the new file alongside the existing phase references.
- `CHERRY_PICK_HEAD` still pointed at `75ae012`, making branch-ref recovery exact and non-destructive.
- The local `dev` HEAD was verified as `82f1b2b`; earlier `a46d2b2` output was not used as evidence.
