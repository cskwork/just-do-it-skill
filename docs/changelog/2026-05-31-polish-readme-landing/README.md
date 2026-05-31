# Run: polish README + landing page

Objective (verbatim): **"update readme of repo improve design and quality of landing page"**

Mode: **LEGACY** (improve existing docs/UI) + **UI/UX overlay** (landing page ships user-facing visual UI;
`reference/taste-skill-v2.md` is the design authority for the page). Topology: **single-driver** — the
surface is two files (`README.md`, `docs/index.html`); a helper fan-out is unwarranted.

Target repo == the `/supergoal` skill's own source. Deliverables: `README.md` and `docs/index.html`
(the GitHub Pages landing page at cskwork.github.io/supergoal-skill).

## User direction (clarified at Intake)

- **Ambition: refine in place** — keep the dark terminal aesthetic and the bilingual (EN/한국어) structure;
  tighten hierarchy, spacing, contrast, typography, responsiveness, accessibility. No re-theme, no rewrite.
- **Quality axes: all four** — visual polish · message clarity · accessibility & performance · content
  accuracy/sync (README ↔ landing ↔ skill behavior).
- **README focus: scannability & structure** — lead with a TL;DR, sharpen hierarchy, surface the core first.

## Priority Rules
Domain(s): web-design + technical-writing/documentation  (source: derived — `ten-rules` skill not present)
1. Lead with the value proposition; a first-time reader grasps "what + why" within the first viewport/section.
2. One clear primary action per surface; do not let secondary CTAs compete with it.
3. Visual hierarchy encodes intent — size/weight/spacing/color signal importance, never decoration.
4. Consistency over novelty — one type scale, one spacing scale, one color-token set; no ad-hoc values.
5. Scannable structure — short sections, meaningful headings, tables/lists over walls of prose.
6. Accessibility is non-negotiable — WCAG-AA contrast, visible focus, semantic markup, reduced-motion fallback.
7. Responsive by default — legible 320px → wide desktop; no horizontal overflow, no clipped controls.
8. Honor the performance budget — single self-contained file, zero deps, no layout shift, fast first paint.
9. Honest content — every claim matches what the skill actually does; keep README and landing in sync.
10. Anti-slop polish — purposeful whitespace, aligned grids, no default gradients/emoji/filler; each element earns its place.

## Phase log

- **Intake** (2026-05-31): mode detected, direction clarified via one question round, vault created,
  Priority Rules distilled, `brief.md` written with acceptance criteria. → Explore.
- **Explore** (2026-05-31): mapped both surfaces + established the verification path. → Plan.
- **Course-correction** (2026-05-31): user flagged that the orchestrator was reading
  `reference/taste-skill-v2.md` and deciding design itself — that work belongs to the **Architect (Plan,
  taste §0–§2)** and **Designer (Build, full file)** subagents (`reference/ui-ux.md`, `reference/experts.md`,
  topology rule "single Designer driver per surface"). Correction: orchestrator stops loading taste; Plan
  and Build are dispatched as subagents; orchestrator ingests only compressed summaries. **Scope added:** a
  surgical `reference/ui-ux.md` clarification so the conductor never loads taste-skill-v2 (brief AC 13).
  RULES-UPDATE: deliverable set now includes `reference/ui-ux.md`.
- **Plan** (2026-05-31): Architect subagent (Opus) grounded + froze `plan.md` (dials 5/2/4, 5 slices,
  em-dash decision: remove all 74 landing + 20 README in EN/KO lockstep). `plan_hash` recorded. → Human Feedback.
- **Human Feedback** (2026-05-31): two briefs presented (plain above technical); user **APPROVED Build —
  full as specified** (full em-dash removal incl. chrome). Build dispatch: Designer→`index.html` (S1-S3),
  writer→`README.md` (S4), executor→`reference/ui-ux.md`(+optional `SKILL.md`) (S5). → Build.
- **Build** (2026-05-31): 3 subagents, one parallel wave (different files, no conflict). Designer:
  `index.html` (`--faint`->#8593a1, focus-visible on all controls, reduced-motion guard, spacing nudges,
  74 em-dashes removed EN/KO lockstep). Writer: `README.md` (TL;DR, scannability, harness-audit fix, 20
  em-dashes removed). Executor: `reference/ui-ux.md` conductor-load clarification (SKILL.md left untouched,
  permitted). Each returned its claim; orchestrator assembled `claims.md` (race-free). → Verify.
- **Verify** (2026-05-31): fresh adversarial Verifier (claims+source only) re-ran every run-to-prove from
  clean state — all GREEN; surgical diff confirmed (3 tracked files + vault); suite 51/51 (WSL+LF+TAP).
  Completeness-critic mapped AC 1-15 + domain checklist, named gaps (ui-ux.md dash exception by design;
  320px reasoned; stackdump cleanup). `verification.md` aggregate `verdict: GREEN`. → QA.
- **QA** (2026-05-31): taste-skill v2 Pre-Flight (Section 14) + a11y by a fresh QA agent against the page +
  3 headless-Chrome renders (`qa/`). 46/47 boxes PASS, a11y clean, no horizontal overflow (measured), no
  visual defect. One box ("Hero stack discipline") fails the count heuristic; **human approved keeping the
  hero as-is** (refine-in-place mandate; contextual rule; pre-existing; not bloated) -> recorded as a
  justified exception. → Deliver.
- **Deliver** (2026-05-31): plan-hash matches (frozen plan intact). Literal `delivery-gate.sh` run against
  this vault (WSL + LF + TAP): artifacts present, verification GREEN no RED, completeness contract,
  suite green -> **== GATE PASS ==** (exit 0). Run-local helpers removed. Crash debris `grep.exe.stackdump`
  deleted.

## Anomaly (surfaced, not silently handled)
An untracked `reddit-draft.md` (a Reddit promo for supergoal-skill) appeared in this vault folder
(mtime 2026-05-31 11:40, during the session). It was NOT created by this run or any dispatched agent and
is outside the objective's scope — most likely written by a separate `reddit-poster` session. Per the
"don't delete what you didn't create" rule it is left in place and surfaced to the user; it is EXCLUDED
from anything this run commits.

## Explore — codebase map (file:line evidence)

### `docs/index.html` (582 lines, one self-contained file)
- CSS design tokens: `:root` `index.html:9-16` (colors, `--mono`/`--sans`, `--fs` text-size multiplier).
- Section structure: gate bar `136-150`; hero `153-187`; `#quickstart` `190-225`; `#modes` `227-274`;
  `#lifecycle` `276-397`; `#vaultsec` `399-429`; `#experts` `431-468`; `#gates` `470-501`; `#proof`
  `503-525`; footer `527-534`; behavior script `536-578`.
- Bilingual mechanism: `html[lang="en"] .ko{display:none}` / `html[lang="ko"] .en{display:none}` `30-32`;
  EN/KO + A-/A+ controls in JS `536-577`. **Parity balanced: 112 `.en` / 112 `.ko` occurrences** — must stay balanced.
- Self-contained: **zero external requests** — no `<link>`, `<script src>`, `@import`, or `url()`; gradients are inline. Good perf baseline.

### `README.md` (119 lines)
- Opens with a bold one-liner + paragraph (`1-16`); landing-page link callout `14-16`; Modes table `22-27`;
  gates `52-56`; Install `58-69`; Layout `71-83`; Proof `85-109`.

### Findings to fix (drive the plan)
- **A11y/contrast (landing):** `--faint #6b7884` on `--bg #0a0c10` ≈ **4.33:1** — below WCAG-AA 4.5:1 for
  normal text. Used in `.note`, `.pipe`, `.flow small`, footer, `.term .g`. `--dim #9aa7b4` ≈ 8:1 (fine).
- **A11y/focus (landing):** `:focus-visible` exists only on `.langtoggle`/`.fsctl` `index.html:50`; `.btn`,
  nav anchors, gate-bar + GitHub links have no explicit focus ring.
- **Motion (landing):** `html{scroll-behavior:smooth}` `index.html:18` is unconditional — no
  `prefers-reduced-motion` guard.
- **Accuracy (README):** Layout block `README.md:82` claims `examples/url-shortener/ ... with harness-audit/`
  but **no `harness-audit/` dir exists** (probed) — false reference.
- **Scannability (README):** no top TL;DR; user asked to lead with the gist.

### Verification path (environment-critical — carry to Verify/Deliver)
- `core.autocrlf=true`, no `.gitattributes` → worktree `.sh`/`.mjs` are **CRLF** though committed **LF**.
- Local msys `/usr/bin/grep` **SIGABRTs (exit 134) on piped input** → `tests/gate-scenarios.test.sh`
  can't run natively here (leftover `grep.exe.stackdump` in repo root is untracked crash debris — do NOT commit).
- **WSL present** (node v23.11.1, working grep). Node ≥22 defaults `--test` to the `spec` reporter; suite
  case 5.1 greps TAP `# pass` → restore with `NODE_OPTIONS=--test-reporter=tap` (Node ignores it for non-test runs).
- **Verified baseline: full suite 51/51 GREEN** via `git archive HEAD` (LF export) under WSL + TAP reporter.
  Reproducible helper: `_verify-suite.sh` (run-local, removed before commit).
