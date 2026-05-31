# Brief — polish README + landing page

## Goal
Improve the **design and quality** of the repo's landing page (`docs/index.html`) and improve the
**scannability and structure** of `README.md` — in place, without changing the established dark
terminal aesthetic, the bilingual (EN/한국어) model, or any factual claim that is already true.

## Audience
- Landing page: a developer who just heard about `/supergoal` and is deciding whether to clone it.
  Must understand "what + why" within the first screen, then find the install/quickstart fast.
- README: a developer browsing the GitHub repo (often from the landing page) who wants the dense,
  accurate reference — what it is, how to install, how the gates work, proof it works.

## Non-goals
- No re-theme, no new color/type system, no framework, no build step, no added dependency.
- No new sections that invent claims; no marketing inflation. Content stays honest to skill behavior.
- No change to the gate scripts, templates, agents/, or any skill logic (`SKILL.md`, `reference/`).
- No restructure of the bilingual mechanism (the EN/KO show-hide toggle stays).

## Acceptance criteria (machine- or eye-checkable)

### Landing page (`docs/index.html`)
1. **Validity & self-containment** — remains a single valid HTML5 file, zero external requests
   (no CDN/font/script fetches), inline `<style>`/`<script>` only. `node`-parseable, no unclosed tags.
2. **Bilingual parity** — every `.en` block has a matching `.ko` block and vice-versa; the EN/KO toggle
   and the A-/A+ text-size control still work; no language leaks (no EN visible in KO mode).
3. **Accessibility (WCAG-AA)** — body and key text meet AA contrast on the dark bg; every interactive
   control has a visible `:focus-visible` state; `prefers-reduced-motion` disables smooth-scroll and
   any added motion; the gate bar and controls expose accessible names (already partly present).
4. **Responsive** — no horizontal overflow and no clipped/overlapping controls at 320px, 375px, 768px,
   1040px+; the sticky gate bar degrades gracefully on narrow widths (existing media queries preserved
   or improved).
5. **Hierarchy & polish** — consistent spacing/type scale via the existing CSS tokens; no ad-hoc
   one-off values introduced; improved visual rhythm (section rhythm, card alignment, lead-in clarity).
6. **Performance** — no layout shift from late assets (there are none); first paint unaffected; total
   file weight does not balloon (target: within ~+25% of current, ideally smaller after cleanup).

### README (`README.md`)
7. **TL;DR first** — a 2–4 line scannable summary near the top so a reader grasps the gist before the prose.
8. **Hierarchy & scan** — headings/lists/tables carry the structure; long prose blocks tightened; the
   landing-page link stays prominent near the top.
9. **Accuracy/sync** — every factual claim (modes, gates, layout, roster, proof numbers, install steps)
   matches `SKILL.md`, `reference/*`, and the landing page. No claim drifts between README and landing.
10. **No broken links/paths** — all relative links resolve to files that exist in the repo.

### Skill-doc clarification (added at user request, 2026-05-31)
The user observed the orchestrator was reading `reference/taste-skill-v2.md` and making design decisions
itself, when the skill assigns that to the Architect (Plan) and Designer (Build) subagents. Fold a
surgical doc fix into this run:
13. **Conductor-load clarification** — `reference/ui-ux.md` (and, if warranted, the `SKILL.md` reference-map
    row) states explicitly that the **conductor never loads `reference/taste-skill-v2.md` itself**; the
    Plan Architect (taste §0–§2 for the Design Read + dials) and the Build Designer (full file) load it in
    their own fresh contexts. One or two lines, no logic/gate change, no churn to other reference files.

### Whole run
14. **No regressions** — `tests/gate-scenarios.test.sh` exits 0 (the project's own suite), run in a
    working environment (WSL + LF export + TAP reporter, per the Explore verification path).
15. **Surgical diff** — only `README.md`, `docs/index.html`, `reference/ui-ux.md` (+ optional one-line
    `SKILL.md`), and this run's vault change; no churn elsewhere.

## Validation
LEGACY mode — no GREENFIELD demand-validation gate. (No `Decision:` line: the delivery gate skips the
GO check for non-greenfield briefs.)
