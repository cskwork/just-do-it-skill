# UI/UX overlay — taste-skill v2 is the design authority

Load this only when the objective ships **user-facing visual UI**: landing page, portfolio,
marketing site, "make it look good / premium / less generic / on-brand", redesign, or any
GREENFIELD/LEGACY slice whose deliverable is frontend look-and-feel. Skip for dashboards, data
tables, and internal tooling unless the brief explicitly asks for visual polish.

When it fires, `reference/taste-skill-v2.md` (the vendored design authority) governs every UI
decision. It is an **overlay** — modes, gates, vault, and the topology rule are unchanged. UI/UX is
wide-and-shallow only at scaffolding; the look-and-feel of one page is deep-and-narrow, so keep a
single Designer driver per surface (topology rule still applies).

| Phase | Overlay (in addition to the normal phase work) |
|---|---|
| Plan | Write a one-line **Design Read** + set the three dials `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY` into `plan.md` (taste §0–§1). Choose a real design system vs. an aesthetic (taste §2). These freeze with the plan. |
| Build | Dispatch the **Designer** role (`reference/experts.md`) reading `plan.md` + `reference/taste-skill-v2.md`; implement to its rules — anti-default, anti-slop, hard em-dash ban, real/generated images (never div-mockups), reduced-motion fallbacks. |
| QA | Run the taste-skill v2 **Pre-Flight Check (§14)** as an added QA gate beside the normal QA. a11y + `prefers-reduced-motion` required. A failed pre-flight rewinds to Build and blocks Deliver — same force as any hard gate. |

Load `reference/taste-skill-v2.md` **only in these phases** — it is large (progressive disclosure).
The conductor (orchestrator) never loads `reference/taste-skill-v2.md` into its own context. The Plan Architect loads taste §0–§2 only (Design Read, the three dials, system-vs-aesthetic) in its own fresh context; the Build Designer loads the full file in its own fresh context.
The Designer never self-approves: the adversarial Verify + committee still gate Deliver.

## Keeping the vendored authority current
`reference/taste-skill-v2.md` is a verbatim upstream copy under a provenance banner, so refreshing is
a body swap, not a merge. Update steps and the pinned commit live in that file's banner.
