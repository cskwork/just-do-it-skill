# 2026-05-31 - Conductor orchestrates only, no matter how small

## Decision

`SKILL.md`: add a hard rule under the conductor definition — once a run starts, the conductor never
edits/writes/runs/builds/fixes anything itself, not even a one-line change; "too small to delegate" is
invalid. Single-trivial-edit objectives still route to "Do NOT use when" (handle outside the skill).

## Reasoning

- Builder != Verifier and role separation collapse if the conductor quietly does "tiny" work itself —
  that work then skips claims/Verify/gates. The existing "never writes production code" line did not
  explicitly forbid small in-run edits; this closes the rationalization.

---

# 2026-05-31 - Harden UI/UX anti-slop enforcement (concrete visual bans + brand alignment)

## Decision

Make the most-violated taste §4.2 / §14 color rules **concrete and brand-aware** in the two
supergoal-owned UI files, so a UI run can no longer rationalize gradient/glow slop past a soft
self-audit. The vendored `reference/taste-skill-v2.md` is NOT touched (body-swap-only authority).

- `agents/designer.md`: added a "HARD VISUAL BANS" block the Designer self-audits before writing its
  `claims.md` entry — one locked accent (adopt the subject's brand color if known, e.g. Claude clay
  coral `#d97757`); no gradient text; no gradient-fill buttons off-brand; no colored glow shadows (the
  LILA tell); alternate section-background rhythm.
- `reference/ui-ux.md`: Plan row gains a **Brand alignment** Design-Read item (known product → adopt its
  brand color/type as the accent system, don't invent a palette); Build row points at the new Hard
  Visual Bans; QA row elevates §14 Color Consistency Lock + §4.2 LILA RULE to **rewind-on-fail**.

## Reasoning

- A bkit-vs-supergoal landing-page comparison produced a supergoal page with a 3-color gradient system,
  gradient headline text, gradient-fill buttons, and colored button glow — exactly the slop taste §4.2
  (max 1 accent, THE LILA RULE, COLOR CONSISTENCY LOCK) and §14 already ban. Root cause was NOT a
  missing rule: the comparison's emulated run never loaded the `ui-ux.md` overlay -> `taste-skill-v2.md`
  -> Pre-Flight path, so the gate never bound. The real, transferable weakness is that the rules are
  soft self-audit and the specific failure modes we saw (gradient *text*, gradient *buttons*, glow
  *shadows*, brand-misaligned palette) are not named as explicit checkboxes — easy to rationalize past.
- Fix targets enforcement, not taste: name the concrete bans where the Designer reads them, add
  brand-color adoption to the frozen plan (so "known product" pages default to the real brand accent
  instead of an invented multi-hue palette), and mark the color/glow Pre-Flight items as hard
  rewind-on-fail. Vendored authority stays verbatim; all edits live in supergoal-owned files.

---

# 2026-05-31 - Plan grounding cherry-pick recovery

## Decision

Resolve the `75ae012` cherry-pick by keeping the `reference/plan-grounding.md` reference-map entry
in `SKILL.md`, and restore the deleted `feat/supergoal-plan-grounding` branch ref to that commit.

## Reasoning

- The incoming change adds Plan-phase grounding documentation and wiring, so the reference map must
  expose the new file alongside the existing phase references.
- `CHERRY_PICK_HEAD` still pointed at `75ae012`, making branch-ref recovery exact and non-destructive.
- The local `dev` HEAD was verified as `82f1b2b`; earlier `a46d2b2` output was not used as evidence.

---

# 2026-05-31 - Completeness contract (close the false-GREEN failure class)

## Decision

Add a machine-enforced **completeness contract** to the delivery gate and wire three supporting
mechanisms across the references, so a GREEN verdict can no longer pass on an incomplete claim set.

- `templates/delivery-gate.sh`: require `verification.md` to carry a `## Coverage` map, a
  `Not covered:` line, and a `Regression tests:` line; fail if any is missing. Verdict semantics
  re-stated in the header: `verdict: GREEN` = "every *enumerated* claim re-verified", not "safe".
- `reference/quality-gates.md`: new "Completeness" section — coverage map (gated), completeness
  critic before GREEN, a worked SSRF/URL-validation domain checklist (names trailing-dot FQDN,
  IPv4-mapped IPv6, octal/hex IP, NAT64), and a ≥3-lens diverse verifier panel for high-severity claims.
- `reference/{pipeline,experts,vault,domain-rules}.md` and `SKILL.md`: Verify exit gates, the
  completeness-critic role, the `verification.md` format block, the gated coverage checklist, and the
  non-negotiable-gates list + final checklist updated to match.
- `examples/.../{url-shortener-service,legacy-link-expiry,debug-hit-undercount}/verification.md`:
  added honest `## Coverage` blocks so the shipped examples satisfy the tightened gate and model it.
- `tests/gate-scenarios.test.sh`: +4 cases (2.5b/c/d completeness-fail, contract-complete PASS path).
  51/51 green.

## Reasoning

- The skill-vs-no-skill experiment (`docs/experiments/2026-05-31-skill-vs-noskill-ssrf`) showed the
  adversarial Verify gate emitting `verdict: GREEN` on still-vulnerable code: both arms missed a
  trailing-dot FQDN SSRF bypass that was never in the enumerated claim set. A gate is only as complete
  as the claims behind it — so the fix is to bound and audit that set, not to add one SSRF check.
- Evidence the fix closes the class: the experiment's actual false-GREEN `verification.md` (0 Coverage
  sections) is now rejected by the gate (exit 1, "no '## Coverage' section"); the SSRF checklist now
  names the exact missed vector, so a compliant Coverage section cannot omit it by silence.
- Proven against the committed examples and the gate harness (Tier A/F): 51/51 cases green, all
  reference-map files present, no removed-vault-file referenced as current.

---

# 2026-05-31 - QA fallback + static-file rendering made explicit (qa.md)

## Decision

Clarify two QA-phase ambiguities in `reference/qa.md` that let a run improvise a non-sanctioned
renderer:

- **Static file / single HTML (no server):** state that there is nothing to serve — agent-browser
  opens the file directly via its `file://` path from the Verify worktree; do not improvise another
  renderer.
- **agent-browser unavailable:** define the fallback explicitly. A headless Chrome/Edge driver may
  stand in only if install is truly impossible, and then under two rules — (a) it runs inside the
  `qa-tester` subagent, never the orchestrator; (b) it does the QA job (golden + edge + a11y +
  as-is/to-be) and is never folded into Verify, which stays a pure `run-to-prove` re-run with no
  browser.

Scope was limited to A+B (qa.md). The experts.md `qa-tester`-vs-browser-native-agent mapping (C) was
deferred — it depends on the project's agent roster and needs verification before editing.

## Reasoning

- An observed run conflated Verify and QA into one agent and used headless-Chrome screenshots instead
  of agent-browser. Cross-checking the skill confirmed the deviation: `pipeline.md` keeps Verify
  (claim re-run, no browser) and QA (agent-browser, black-box) as separate gates, and `qa.md` already
  forbids running the browser from the orchestrator and prescribes STOP+prompt — not a Chrome fallback.
- Root cause was runtime non-compliance, not a skill defect, but two gaps invited it: the "Web app"
  steps were written server-first (so "no server" read as "section N/A"), and the only escape hatch
  on a blocked install was STOP, with no stated constraints if an agent improvises a fallback anyway.
  The edits close both without changing any gate or the agent-browser-first preference.

---

# 2026-05-31 - Disambiguate the LEGACY Explore dispatch

## Decision

Make the LEGACY Explore phase a distinct **Explorer** role driven by the `explore` agent, separate
from the `architect` (Plan only).

- `reference/experts.md`: split the roster row `Architect (Plan/Explore)` into two —
  `Explorer (LEGACY Explore)` → `explore` (Sonnet), reads `brief.md`, produces the `README.md`
  codebase map with file:line citations; `Architect (Plan)` → `architect` (Opus), reads brief +
  README map, produces `plan.md`. Explorer fans out `Explore` (broad-search) helpers for parallel
  mapping.
- `reference/pipeline.md`: LEGACY Explore row reworded from "use `explore` skill/agent" to
  "driven by the `explore` agent; fan out `Explore` helpers for parallel mapping".

## Reasoning

- The two references disagreed: `pipeline.md` told Explore to "use the `explore` agent" while the
  `experts.md` roster mapped Plan/Explore to a single `architect`. Ambiguous dispatch — unclear which
  agent type and read-scope the phase runs under.
- Reading A (own Explorer role) wins on the skill's own thesis: fresh context + role separation per
  phase, one job per agent. Explore produces a citation map (`README.md`); Plan produces design
  (`plan.md`). Different jobs with different read-sets, so different roles.
- The dedicated `explore` agent type (read-only search specialist) fits codebase mapping; `architect`
  (Read/Grep/Glob) is reserved for the Plan-phase grounding it already owns. Sonnet tier for the
  search/mapping pass; the Opus architect consumes the map downstream.
- `reference/learn.md:12` already lists `explore` first for codebase mapping, so no change there.

---

# 2026-05-31 - Close the agent-availability assumption (general-purpose fallback)

## Decision

State explicitly that the roster lists **preferred** agent types and define a fallback, so a host
without the named types degrades gracefully instead of failing the dispatch.

- `reference/experts.md`: new "Agent availability & fallback" paragraph after the roster intro — the
  types are the host's project roster (not installed by the skill); a role is defined by its
  locked-prompt + read-scope + model tier, not the type name; if a preferred type is absent, dispatch
  the same locked-prompt to `general-purpose` (read-only phases prefer built-in `Explore`/`Plan`) with
  the model tier pinned. External CLIs (`codex`, `gemini`) are not `Task` subagents — reached via their
  own skills (`codex-cli`, `ccg`, `ask`) and out of scope for role dispatch.

## Reasoning

- The references assumed `explore`/`architect`/`verifier`/etc. exist (`experts.md:11` "use the existing
  project agent types"; `SKILL.md:16` "nothing to install"), with no fallback if a type is missing — on
  a vanilla Claude Code roster `Task(subagent_type:'explore')` would simply fail.
- The skill's own SSRF experiment already ran on `general-purpose`
  (`docs/experiments/2026-05-31-skill-vs-noskill-ssrf/report.md:28`), so the doc now matches what
  execution already did, and portability beyond the OMC roster is preserved.
- A per-agent reference (e.g. `reference/explore.md`) would not fix this — the gap spans the whole
  roster. The real contract is the locked-prompt + read-scope + model tier; the type name is only a
  binding, so the fallback keys on re-using that contract under `general-purpose`.
- `codex`/`gemini` are a different mechanism (external CLIs via skills, not `Task` subagent types); they
  appear only as benchmark baselines in `README.md`/experiments, never as dispatch targets, so the note
  marks them out of scope rather than adding them to the roster.

---

# 2026-05-31 - Bundle role personas as files; make dispatch harness-agnostic

## Decision

Make the skill **self-contained and harness-agnostic** (Claude Code, Codex, agy, other coding CLIs) by
bundling each role as a persona file and defining one harness-neutral dispatch procedure. Supersedes the
earlier "general-purpose fallback" half-measure and rejects a Claude-Code plugin as the *core* mechanism.

- New `agents/` — one persona file per role (11): `analyst`, `explore`, `architect`, `executor`,
  `designer`, `verifier`, `completeness-critic`, `security-reviewer`, `code-reviewer`, `qa-tester`,
  `debugger`. Each is `name`/`description`/`tools`/`model` frontmatter (Claude-Code-compatible, ignored
  elsewhere) + a locked-prompt body (ROLE / READ ONLY / DO / RULES / WRITE / RETURN / GATE).
- `reference/experts.md`: rewrote the dispatch section to "Role -> persona -> model tier" — the persona
  file (not any harness's agent registry) is the source of truth; added the 3-step harness-agnostic
  dispatch procedure (select -> spawn/inline -> collect); frontmatter/read-scope is enforced where the
  harness supports it and advisory elsewhere; `critic`/`tracer` are alternate Claude-Code agent-type
  names, not extra files.
- `SKILL.md`: expert-roster paragraph + reference map now point at `agents/<role>.md` and the
  harness-agnostic procedure.
- `README.md`: lead-in + Layout note the `agents/` source-of-truth and cross-harness dispatch; **resolved
  a committed merge-conflict marker** in the Layout block (HEAD vs `feat/learn-flow`) — kept the union
  reference list (`... qa . domain-rules . plan-grounding . learn`).

## Reasoning

- Requirement from the user: the skill must run across Claude Code, Codex, agy, and other harnesses —
  "not just to claude code plugin harness". A Claude Code plugin (auto-registered `agents/`) is
  Claude-Code-only, so it cannot be the core; per the claude-code-guide lookup, the Task tool offers no
  "load persona from file path" param and skill-internal `agents/` is not scanned — so registration is
  inherently harness-specific.
- The portable equivalent of "orchestrator only selects, harness auto-injects": the persona is a file
  the orchestrator *names*, and a single fixed procedure spawns it. The orchestrator never improvises a
  role prompt (the real concern), and on harnesses with native agent loading (optional CC plugin wrapper)
  it still gets true auto-injection — dual-use with zero fork.
- One file per role (global rule: one file = one purpose); aliases handled by a doc line, not file
  proliferation. Read-scope/model tier degrade to advisory on harnesses that cannot enforce them — stated
  openly, consistent with the existing "instruction-only isolation is weaker" note.
- Memory: recorded the harness-agnostic constraint as a durable project rule so future changes do not
  recouple to a single harness.
