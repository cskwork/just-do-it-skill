# Plan — polish README + landing page (LEGACY, UI/UX overlay)

Mode: LEGACY refine-in-place. Surface: `README.md` + `docs/index.html` (+ `reference/ui-ux.md`, optional 1-line `SKILL.md`).
Frozen once on plan-hash. Build implements; Build does not redesign.

## 1. Design Read (taste §0.B)

Reading this as: a developer-tool project landing page (and its companion GitHub README) for a developer deciding whether to clone `/supergoal`, with a dark-tech / terminal language, leaning toward native CSS + existing inline design tokens (a refine-in-place, not a re-theme).

## 2. Dials + system-vs-aesthetic (taste §1, §2 — frozen)

This is a **redesign-preserve** job, so dials match the existing page (taste §1.A "redesign - preserve" = match existing, motion +0 here because we are *reducing* motion liabilities, not adding):

- **`DESIGN_VARIANCE: 5`** — the page is largely symmetric (3-up card/step grids, 2-col gates, full-width flow rails). Reason: preserve existing structure; polish rhythm and alignment, do not introduce asymmetry.
- **`MOTION_INTENSITY: 2`** — the only motion is `scroll-behavior:smooth` + CSS `:hover`. Reason: keep it near-static; the work *removes* the unconditional smooth-scroll behind a `prefers-reduced-motion` guard, adds no new motion.
- **`VISUAL_DENSITY: 4`** — "Daily App" spacing (`py` ~54px sections, `1040px` wrap, mono numerics). Reason: matches current token scale; tighten rhythm within it, add no new density.

System vs aesthetic (taste §2.B): this is a **native-CSS "Dark tech / hacker" aesthetic** (mono + neon accent + terminal motifs), **not** an official design system. Honesty rule honored: no framework, no design-system package, zero external requests. Build owns the look-and-feel against `reference/taste-skill-v2.md` in full; the existing `:root` tokens (`index.html:9-16`) are the one token set — no ad-hoc values (Priority Rule 4).

## 3. Grounding grill (agent-answered, Track B deepening flavor)

These are answered from the files read (`index.html`, `README.md`, `taste-skill-v2.md §0/§1/§2/§9.G/§14`, computed contrast), not asked of the human.

- **Q: Does lightening `--faint` break the established palette harmony?**
  A: No. `--faint #6b7884` (4.33:1 on `--bg`, 4.05:1 on the `--panel` cards where it also lives → both fail AA 4.5:1) sits between `--bg` and `--dim #9aa7b4` (7.98:1, fine). Computed: bumping `--faint` to **`#8593a1`** gives **6.23:1 on `--bg` and 5.82:1 on `--panel`** — same blue-grey hue family, still visibly "fainter" than `--dim`, clears AA on both surfaces with margin. One token edit, palette family preserved.

- **Q: Will em-dash removal damage Korean readability or EN/KO parity?**
  A: No, if done in lockstep. KO copy uses `—` the same way EN does (e.g. `index.html:285` "공유 폴더인 **볼트(vault)**를 통해"), as parenthetical asides and value-restatements that map cleanly to a period, comma, colon, or parens — punctuation Korean already uses. Parity is preserved by editing every `.en`/`.ko` pair together and re-counting `.en`/`.ko` blocks after (must stay 112/112). Risk to watch: the gate bar literal `— artifacts ok …` (`index.html:138`) and the footer rails (`530`, `532`) — these are visible chrome, not body, and must lose `—` too.

- **Q: Do focus rings + reduced-motion risk visual regressions?**
  A: Low. A `:focus-visible` ring already exists on toggle buttons (`index.html:50`, `outline:2px solid var(--acc2); outline-offset:-2px`) — extend the *same* rule to `.btn`, nav/footer anchors, and gate-bar links (reuse, no new token). `prefers-reduced-motion` wraps only `scroll-behavior:smooth` (`index.html:18`); since no JS animation exists, the guard is `@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}` — zero layout impact, no paint change for users without the preference.

- **Q: Is a README TL;DR redundant with the existing intro?**
  A: The current intro (`README.md:3-12`) is a strong but *dense* 10-line prose block — it states what+why but is not a 2-4 line scan. A TL;DR is additive scannability (brief AC 7), not a duplicate: a tight 2-4 line "what it is / what it gives you / where to start" placed above the existing prose, which stays. No claim invented.

- **Q: What could silently break bilingual parity?**
  A: (a) editing an EN aside without its KO twin; (b) deleting a `—` inside one language's `<span>` and accidentally merging two spans; (c) restructuring a sentence that splits a `.en` block into two while leaving `.ko` as one. Contract guard: after edits, re-run the `.en`/`.ko` block count (must equal, currently 112/112) and an EN-mode/KO-mode visual scan for language leaks. This is in the Contracts section and is a QA check.

- **Q: harness-audit accuracy — is the dir really missing?**
  A: Probed. `examples/url-shortener/` contains `README.md bin/ docs/ package.json src/ test/` and `docs/changelog/{debug-hit-undercount, legacy-link-expiry, url-shortener-service}` — there is **no `harness-audit/`**. `README.md:82` `examples/url-shortener/   a real service … with harness-audit/` is a false reference (brief AC 9/10). Fix: drop `, with harness-audit/` (or point to `docs/changelog/` which does exist).

## 4. Task table / slices

Each slice ≤5 files / ≤~500 lines, independently testable, mapped to brief AC numbers. Reuse noted per slice.

| # | Slice | Files | Acceptance check | AC |
|---|---|---|---|---|
| S1 | **Landing a11y: contrast + focus + reduced-motion** | `docs/index.html` (1) | `--faint` → `#8593a1`; computed AA ≥4.5:1 on `--bg` and `--panel` (6.23 / 5.82). Extend the existing `:focus-visible` rule (`:50`) to `.btn`, nav/footer/gatebar anchors — every interactive control shows a visible ring on keyboard focus. Add `@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`. Reuse `--acc2` ring + existing token; add no new color. | 3 |
| S2 | **Landing hierarchy/spacing/typography polish (within tokens only)** | `docs/index.html` (1) | Tighten section rhythm, card/step alignment, lead-in clarity using only existing `:root` tokens / `--fs` scale — no new ad-hoc px values introduced. Eye-check: improved vertical rhythm at 1040px+, hero→quickstart lead-in clearer. No structural/section change, no token additions. | 5 |
| S3 | **Em-dash removal — landing (EN + KO, lockstep)** | `docs/index.html` (1) | Zero `—` and zero `–` anywhere visible (currently **74** `—`). Replace with period / comma / colon / parens / hyphen / restructure, preserving meaning. Includes gate-bar chrome (`:138`) and footer rails (`:530`,`:532`). EN/KO edited as pairs; `.en`/`.ko` block count stays **112 / 112**; no language leak. Taste §9.G + §14 pass. | 2, 3 |
| S4 | **README: TL;DR + scannability + harness-audit fix + em-dash sync** | `README.md` (1) | (a) 2-4 line TL;DR added near top, existing intro retained, landing link stays prominent. (b) Long prose tightened; headings/tables/lists carry structure. (c) `README.md:82` false `harness-audit/` reference removed/corrected — all relative links resolve. (d) Zero `—`/`–` (currently **20** `—`), synced to the landing's style. No invented claim; every fact matches `SKILL.md`/`reference/*`/landing. | 7, 8, 9, 10 |
| S5 | **`reference/ui-ux.md` conductor-load clarification (+ optional 1-line `SKILL.md`)** | `reference/ui-ux.md` (1) [+ `SKILL.md` 1 line optional] | One or two lines stating the **conductor never loads `reference/taste-skill-v2.md` itself** — the Plan Architect (taste §0–§2) and Build Designer (full file) load it in their own fresh contexts. No logic/gate change, no churn to other reference files. | 13 |

Verification slice (Verify/Deliver, not a Build slice): `tests/gate-scenarios.test.sh` exits 0 via `git archive HEAD` (LF export) under WSL + `NODE_OPTIONS=--test-reporter=tap` (per Explore verification path). Surgical-diff check: only the files above + this vault changed; `grep.exe.stackdump` not committed (AC 14, 15).

## 5. Architecture (what stays frozen)

Single self-contained `docs/index.html`: one `<style>` block of `:root` CSS custom-property tokens (`index.html:9-16`) → all spacing/type/color derive from them and the `--fs` multiplier; one bilingual mechanism (`html[lang="en"] .ko{display:none}` / `html[lang="ko"] .en{display:none}`, `:30-32`) driven by the inline `<script>` (`:536-578`) with EN/KO + A-/A+ controls. **Frozen invariants:** the dark blue-grey palette *family*, the EN/KO show-hide toggle + A-/A+ control, zero external requests (no `<link>`/`<script src>`/`@import`/`url()`), no framework, no build step. Polish happens *inside* this structure — token-value nudges, focus/motion rules, copy edits — never re-theme or re-architecture. README mirrors the page's claims and house style.

## 6. Contracts (invariants Build must preserve)

1. **Exact EN/KO parity** — `.en` and `.ko` block counts stay equal (currently 112 / 112); every copy edit touches both twins; no language leak in either mode; A-/A+ and EN/KO toggles still work.
2. **Zero external requests** — no CDN/font/script/`@import`/`url()` fetch added; single file.
3. **Valid HTML5** — `node`-parseable, no unclosed/orphaned tags after edits (esp. when restructuring `—`-joined spans).
4. **No new dependencies, no framework, no build step.**
5. **No gate/template/agents/skill-logic change** — `templates/*`, `agents/`, `SKILL.md` mode/gate logic, other `reference/*` untouched (the only `SKILL.md` touch allowed is the optional 1-line doc note in S5).
6. **Surgical diff** — only `README.md`, `docs/index.html`, `reference/ui-ux.md`, optional 1-line `SKILL.md`, and this run's vault. No reformatting of untouched lines. `grep.exe.stackdump` is untracked crash debris — do not commit.
7. **Honest content** — no invented claims; README ↔ landing ↔ skill behavior stay in sync; `harness-audit/` reference fixed because the dir does not exist.
8. **One token set** — no ad-hoc px/hex values; the only color change is `--faint`'s value (a11y fix), staying in the existing hue family.

## Human Feedback

### Plain-language brief

We are going to polish the project's landing page and tidy its README so a developer who just heard about the tool can understand what it is and how to start within seconds, without changing how anything works. The landing page keeps its current dark "terminal" look and its English/Korean toggle; we only sharpen spacing, fix text colors that are currently too dim to read comfortably, and make sure keyboard users can see where they are. The biggest visible change is that we will remove every long dash ("—") from both the page and the README, because the project's own design rulebook bans that punctuation as a tell-tale sign of machine-written copy. There are about 74 of these dashes on the page and 20 in the README, and each will be rewritten into a period, comma, colon, parentheses, or a plain hyphen so the meaning stays the same in both English and Korean. We will also fix one README line that points to a folder ("harness-audit/") that does not actually exist. No new features, no new look, no new dependencies.

### Technical brief

Five surgical slices, all within the existing single-file, zero-dependency setup. **S1 (a11y, `docs/index.html`):** change the `--faint` token from `#6b7884` to `#8593a1` (computed WCAG-AA contrast goes from a failing 4.33:1 to 6.23:1 on the page background and from 4.05:1 to 5.82:1 on the cards, clearing the 4.5:1 bar for normal text on both surfaces while staying the same blue-grey hue); extend the one existing `:focus-visible` rule so buttons, nav links, gate-bar links, and footer links all show a visible keyboard-focus outline; wrap the unconditional `scroll-behavior:smooth` in `@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`. **S2:** tighten section rhythm and card alignment using only the existing `:root` tokens and the `--fs` multiplier, introducing no new px/hex values. **S3:** remove all 74 em-dashes from the page (including the gate-bar chrome line and footer credit) by rewriting copy in lockstep across each `.en`/`.ko` pair, then re-counting that `.en`/`.ko` blocks still equal 112/112 and visually checking each language mode for leaks. **S4 (`README.md`):** add a 2-4 line TL;DR above the existing intro, tighten prose into headings/lists, remove the false `harness-audit/` path, and remove all 20 em-dashes to match the page. **S5 (`reference/ui-ux.md`, optional 1 line in `SKILL.md`):** add one to two lines stating the conductor never loads `taste-skill-v2.md` itself. **Risks/tests:** the main risk is silently breaking English/Korean parity while editing dashes — guarded by the equal-block-count contract and a per-language visual pass; HTML must stay valid after merging dash-joined `<span>`s; the project suite (`tests/gate-scenarios.test.sh`) must still exit 0, run under WSL with the TAP reporter and LF export per the Explore verification path.

### Terms

- WCAG-AA contrast ratio: an accessibility threshold; normal-size text must have at least 4.5:1 luminance contrast against its background to be comfortably readable.
- prefers-reduced-motion: an OS/browser setting some users enable; respecting it means turning off animations and smooth-scrolling for them.
- Bilingual parity: every English text block has an exact Korean counterpart (and vice-versa) so the EN/KO toggle never shows a half-translated or leaking page; here measured as equal `.en` and `.ko` block counts (112/112).
- Em-dash: the long horizontal dash character; the project's design authority (taste-skill v2 section 9.G) bans it outright as the single most common sign of machine-generated copy, so it is replaced with ordinary punctuation.
- Design token: a named CSS variable (e.g. `--faint`) reused everywhere a value is needed, so one edit updates the whole page consistently and no one-off values creep in.

### Approval request

Approve Build of slices S1-S5 as specified, with the em-dash removal (74 on the landing page, 20 in the README, rewritten in EN/KO lockstep) being the single largest copy change and a deliberate divergence from the repo's current house style — done because the project's own design rulebook bans the em-dash and the brief chose the anti-slop quality axis. Alternatively, request changes (e.g. narrow the em-dash removal to body copy only and keep it in chrome) or stop.
