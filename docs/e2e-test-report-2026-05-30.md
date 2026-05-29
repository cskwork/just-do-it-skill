# just-do-it-skill — E2E + Consistency Test Report

Date: 2026-05-30
Repo: `/Users/danny/Documents/PARA/Resource/just-do-it-skill`
Plan executed: `docs/e2e-test-plan.md` (Tiers A–F + 3 consistency lenses)
Working tree: unmodified (all fixture mutations ran in mktemp copies; `git status` clean).

## 1. Verdict

**Overall: PARTIAL** — the literal delivery gate (the one machine-enforced backstop) is fully correct and install-parity-clean, and all documentation/landing-page cross-checks substantially cohere. But the shipped worked-examples and the test plan's own adversarial fixtures contradict the documented model, and every inter-phase "gate" except the delivery gate is prose-only. Nothing is fundamentally broken; several authoritative artifacts disagree with reality and must be reconciled.

### Results by tier (mirrors the e2e-test-plan execution checklist)

| Tier | Status | One-line evidence |
|------|--------|-------------------|
| A — delivery-gate.sh scenarios A1–A11 + install parity | PASS | 11/11 fixtures hit the exact exit code + FAIL/PASS reason; installed copy sha256-identical to repo (`a2d8705b…`); `bash -n` clean. |
| B/C — gating-mechanism trace (B4, C1–C5) | WARN (traced, not live) | Only `delivery-gate.sh` is enforced (NO-GO/RED/missing-artifact all provably blocked). Circuit-breaker, frozen-plan, approval-gate, read-scope, NO-GO-before-Build are instruction-only prose with no runtime enforcer. |
| D — vault layout (D2 6-file spec) | FAIL | All 3 canonical changelog example dirs ship the OLD layout; none contains `README.md`; they carry forbidden `decisions.log`/`architecture.md`/`validation.md`/`qa-report.md`. |
| E — suite sanity (E2) | PASS | Pristine `url-shortener` is GREEN 68/68; flipping one `validate.js` comparison goes RED 66/68 incl. the targeted assertion — suite genuinely constrains the impl. |
| F — docs/consistency lint (F1–F4) | PASS | F1 all 7 reference-map files exist; F2 legacy-artifact hits only in vault.md migration note; F3 `bash -n` clean; F4 index.html tags balanced (9/9 sections) with the 6-file vault table. |
| Consistency Lens 1 — skill internals | PASS (2 LOW notes) | 11 PASS / 2 WARN: 6 gates backed, 6-file contract + section names match SKILL.md/vault.md and are enforced by the gate; modes/pipelines byte-identical. WARN: SKILL.md roster omits critic/tracer; `cycles` keys fixed vs "vary by mode". |
| Consistency Lens 2 — landing page vs docs | PARTIAL (1 FAIL) | 12/13 PASS (modes, gates, vault path/count, CB numbers, gate behavior, roster, commands, live 68-test proof). FAIL: landing cites `harness-audit/` which does not exist. |
| Consistency Lens 3 — e2e-test-plan vs repo reality | PARTIAL (3 FAIL) | 18/21 PASS (gate logic, fixture targets, ref-map, pipeline mechanisms). FAIL: Appendix-1 & Appendix-2 adversarial fixtures break the committed default suite, invalidating B2/C1's "suite stays green" premise; gate is mode-blind re "Decision: GO for greenfield". |

## 2. Scope — what was executed vs traced vs not run

**Deterministically EXECUTED (live):**
- Tier A: all 11 delivery-gate fixtures run against the repo gate in mktemp dirs; install-parity diff + sha256; `bash -n`.
- Tier E: `node --test` on a pristine mktemp copy of `examples/url-shortener` (68/68 GREEN) and on a deliberately broken copy (66/68 RED).
- Tier F (F3) and Lens-2/Lens-3 corroboration: live `bash -n`, live `npm test` (68 tests), Appendix-1 fixture applied to mktemp copy (67/68, `hit-concurrency.test.js` fails), Appendix-2 fixture applied to mktemp copy (validate suite 25/30, 5 fails).
- Tier D, F1/F2/F4, Lenses 1–3 static portions: `ls`/`grep`/`diff`/Read on the read-only tree.

**Statically TRACED, not driven live (by design):**
- Tiers B/C inter-phase gates (B4 halt-before-Build, C1 builder≠verifier + RED-rewind, C2 circuit breaker, C3 frozen plan, C4 approval gate, C5 verifier read-scope). A full live run requires the human approval gate (C4) and multi-agent orchestration, so these were verified by reading pipeline.md/quality-gates.md/experts.md/debugging.md/vault.md/SKILL.md/state.json and confirming the gate behavior the prose claims. The terminal delivery gate within this set WAS executed; the inter-phase gates were not, because there is no runtime enforcer to exercise.

**NOT run:**
- A full end-to-end live GREENFIELD/DEBUG/LEGACY pipeline with real subagents and a live human approval. No agent drove an actual `/just-do-it` session through Intake→Deliver.

## 3. Room for improvement (prioritized; deduped across all agents)

### True bugs / inconsistencies (fix these)

**HIGH-1 — All 3 canonical changelog example dirs ship the OLD vault layout, contradicting the D2 6-file spec.**
Where: `examples/url-shortener/docs/changelog/{debug-hit-undercount,legacy-link-expiry,url-shortener-service}/`
Why it matters: these are the repo's flagship worked examples. D2 (and SKILL.md/vault.md) require exactly 6 files — README/brief/plan/claims/verification/state.json — with NO `validation.md`/`qa-report.md`/`architecture.md`/`decisions.log`. Verified on disk: debug-hit-undercount = {brief, decisions.log, plan, state.json, verification} (no README, no claims); legacy-link-expiry = {architecture.md, brief, claims, plan, state.json, verification} (no README); url-shortener-service = {brief, claims, decisions.log, plan, qa-report.md, state.json, validation.md, verification} (no README). NONE contains `README.md`, the spec's primary log file. A user inspecting them sees a layout the docs explicitly call removed.
Smallest accurate fix: hand-migrate each dir to the 6-file set — rename/merge the running log into `README.md`, fold `architecture.md`/`validation.md`/`decisions.log` into `plan.md`/`brief.md`/`README.md`, move `qa-report.md` content into `verification.md`'s `## QA` section, add the missing `claims.md`. Add a Tier-D grep/CI check over `examples/*/docs/changelog/*/` to stop future drift.

**HIGH-2 — Appendix-1 fixture breaks the committed default suite, invalidating B2's "suite stays green" trap.**
Where: `docs/e2e-test-plan.md:81-82,192-210`; `examples/url-shortener/test/hit-concurrency.test.js:20`
Why it matters: B2's whole point is a green suite that hides a concurrency bug, forcing DEBUG to root-cause it. But `hit-concurrency.test.js` is committed and runs under default `npm test`. Applying the lost-update fixture to a clean copy yields 67/68 (concurrency test fails, recorded 1 of 200). DEBUG would be handed an already-RED suite, not a deceptively green one — the scenario is unreproducible as written.
Smallest accurate fix: update B2 to acknowledge `hit-concurrency.test.js` is the pre-existing repro (B2 becomes "suite already RED; DEBUG root-causes `store.js`"), OR have B2 instruct deleting/excluding `hit-concurrency.test.js` before applying the fixture so DEBUG writes its own failing test.

**HIGH-3 — Appendix-2 fixture fails the builder's own unit tests, invalidating C1's "builder's tests pass" premise.**
Where: `docs/e2e-test-plan.md:106-109,212-216`; `examples/url-shortener/test/validate.test.js:38,40`
Why it matters: C1 claims dropping IPv6/FQDN-dot handling leaves the unit suite green so only an adversarial Verify catches the SSRF gap. But `validate.test.js` already asserts the exact bypass hosts are rejected (`http://[::ffff:127.0.0.1]/`, `http://localhost./`). Applying the fixture yields 25/30 on the validate suite — the unit suite catches it directly, so the "green builder / RED adversary" gap is unreproducible.
Smallest accurate fix: reframe C1/Appendix-2 — either present `validate.test.js` as the regression suite that already guards these hosts (a weaker, different test), or instruct removing those two assertions before applying the fixture so the adversarial gap is genuine.

**HIGH-4 — Landing page cites a non-existent audit path (`harness-audit/`).**
Where: `docs/index.html:333`
Why it matters: the Proof section ("Full audit trail ships in `examples/url-shortener/harness-audit/`") points to a directory that does not exist (`ls` fails; `find` returns nothing). The real audit is at `examples/url-shortener/docs/changelog/` (3 run folders) — exactly where `README.md:77` correctly points. A visitor following the page's central "proof it works" claim hits a dead path.
Smallest accurate fix: change `examples/url-shortener/harness-audit/` to `examples/url-shortener/docs/changelog/`, and add README's caveat that "these early run records predate the 6-file consolidation."

**HIGH-5 — NO-GO "halt before Build" is pipeline-prose, not enforced; the script only catches it at Deliver.**
Where: `reference/pipeline.md:39`; `templates/delivery-gate.sh:37-47`
Why it matters: B4 treats "no Build, no code written" as a guarantee, but `delivery-gate.sh` is the only executable and runs at Deliver — its NO-GO check is a terminal backstop. A drifting agent that builds on a NO-GO would still write code and only be caught at the end (and only if a literal `^Decision: NO-GO` survived into brief.md). Phase ordering relies entirely on LLM discipline.
Smallest accurate fix: add a tiny `validate-gate.sh <vault>` that exits non-zero unless brief.md has a `Decision: GO` line, invoked as the literal entry condition for Build — converting the Validate exit gate into the same machine-checkable form as the delivery gate.

**HIGH-6 — Circuit-breaker counters exist in state.json but nothing increments or checks them.**
Where: `templates/state.json:10-13`; `reference/pipeline.md:90-91`
Why it matters: state.json ships `cycles`/`max_cycles_per_phase=5`/`error_signatures`/`circuit_breaker_threshold=3`, but no script/hook updates or compares them; enforcement is pure LLM self-policing, and "same error signature" has no normalization rule. C2's pass criterion ("terminates with escalation, not a hang") is guaranteed only by model discipline.
Smallest accurate fix: define an error-signature normalization (first failing assertion + file:line, lowercased, stack-trimmed); have the orchestrator write each cycle's signature+count to `state.json.error_signatures`; add a small bash helper that reads state.json and exits non-zero at count≥3 before each rewind.

**MEDIUM-1 — `debug-hit-undercount` example is missing `claims.md` (verifier read-scope artifact).**
Where: `examples/url-shortener/docs/changelog/debug-hit-undercount/`
Why it matters: claims.md is the contract the fresh Verifier reads (C5 read-scope = claims.md + code only). Its absence means the canonical DEBUG demo cannot illustrate the builder-vs-verifier handoff the skill is built around. (Subsumed by HIGH-1's migration, but called out because it breaks the most important demonstration.)
Smallest accurate fix: add a `claims.md` with at least one run-to-prove claim mirroring the concurrency repro.

**MEDIUM-2 — "Frozen plan.md" has no write-protection or change-detection.**
Where: `reference/vault.md:37-38`; `templates/delivery-gate.sh:25`
Why it matters: "frozen" is a label only — no chmod, hash, or diff guard. The gate only checks plan.md is non-empty (`[ -s ]`), never that it was unchanged during Build. C3's "plan.md unchanged during Build" is unverifiable, so silent scope drift (the documented #1 drift risk) can occur undetected.
Smallest accurate fix: on Plan exit, record `sha256(plan.md)` into `state.json.plan_hash`; have the orchestrator/gate re-hash and fail if it changed without a logged re-plan step.

**MEDIUM-3 — C4 approval-gate field-name mismatch makes the check itself unverifiable on the real example.**
Where: `templates/state.json:9` vs `examples/url-shortener/docs/changelog/debug-hit-undercount/state.json:11`
Why it matters: C4 targets `state.json.approval == null`. The template has `approval: null`, but the DEBUG example has no `approval` field (uses ad-hoc `approval_to_fix`) and LEGACY uses `approval_to_build`. A check keying on `.approval` reads `undefined`, not `null`, and nothing programmatically blocks writes while approval is unset.
Smallest accurate fix: standardize on a single `approval` field across template and examples (e.g. `{"phase":"Fix","status":"APPROVED"}` when granted) so a guard can assert `approval.status=="APPROVED"` before the first source write.

**MEDIUM-4 — Verifier read-scope isolation is a prompt instruction, not a tool-permission sandbox.**
Where: `reference/experts.md:50-59`
Why it matters: the locked-prompt "READ ONLY THESE VAULT FILES … (do not read beyond your scope)" is correct design intent, but a dispatched subagent retains Read/Grep access to the whole vault, so a drifting Verifier could read plan.md/brief.md and inherit the builder's rationale — defeating the builder≠verifier separation C1/C5 rely on.
Smallest accurate fix: when dispatching the Verifier, restrict tool access (`allowedTools`/read allowlist scoped to claims.md + source paths) so isolation is harness-enforced, not requested.

### Nice-to-haves (polish, not bugs)

**LOW-1 — Gate is mode-blind; it does not enforce "Decision: GO for greenfield" as the plan/SKILL claim.**
Where: `docs/e2e-test-plan.md:74`; `SKILL.md:72`; `templates/delivery-gate.sh:40-47`
The gate only checks GO/NO-GO when a `Decision:` line is present (A8 confirms a brief with none still passes). It has no greenfield/DEBUG signal. Fix: reword the claim to "IF a Decision line is present it must be GO (greenfield writes one; DEBUG/LEGACY do not)". True greenfield enforcement would need a mode signal in state.json — a design change, not a doc fix.

**LOW-2 — SKILL.md expert roster omits the two slash-alternate agent types named in experts.md.**
Where: `SKILL.md:90-91` vs `reference/experts.md:19,23`
SKILL.md's parenthetical roster omits `critic` and `tracer`, which experts.md lists as alternates and which exist as real agents in `~/.claude/agents/`. Fix: add the alternates (`… debugger/tracer, verifier/critic`) or reword to "(see reference/experts.md for the full list)".

**LOW-3 — `state.json.cycles` uses fixed keys while vault.md says cycle-counter keys vary by mode.**
Where: `templates/state.json:10` vs `reference/vault.md:25`
The template hardcodes `cycles {Build, Verify, QA, Fix}` (mixing DEBUG-only `Fix` with GREENFIELD/LEGACY phases), not matching any single mode. Fix: either annotate that keys are mode-dependent, or reword vault.md to "a fixed cycles object covering all phases". Pick one source of truth.

**LOW-4 — Landing DEBUG pipeline string adds an `approve` node SKILL.md's pipeline omits.**
Where: `docs/index.html:165` vs `SKILL.md:46`
Landing renders `Intake → Reproduce → Diagnose → approve → Fix → Verify → Deliver`; SKILL.md omits the `approve` node (the approval is folded into Diagnose per pipeline.md:56). Not a contradiction, but two depictions of the same pipeline with different step counts. Fix: align SKILL.md to surface the approval node, or footnote the landing page.

**LOW-5 — A5 "verdict: RED remains" branch is only reachable when GREEN precedes RED; the test plan doesn't state this.**
Where: `templates/delivery-gate.sh:30-34`; `docs/e2e-test-plan.md:40-41,51-60`
A verification.md with ONLY `verdict: RED` (no GREEN) fails earlier at the GREEN check, not with the RED-remains message. The A5 fixture must contain GREEN then a line-start RED, which the plan does not make explicit (and the paste-run harness has no A5 case). Fix: clarify A5's fixture wording and add an explicit A5 line to the harness.

## 4. Recommended next actions

1. **Fix the documentation/example contradictions first (cheap, high trust impact):** HIGH-4 (one-line path swap in index.html), HIGH-1 + MEDIUM-1 (migrate the 3 example dirs to the 6-file layout, adding README.md + claims.md), and reconcile HIGH-2/HIGH-3 by rewording B2/C1/Appendix-1/Appendix-2 to match the committed regression tests. These are doc/data edits with no design risk and remove every reader-facing contradiction.
2. **Decide the enforcement posture for the inter-phase gates (HIGH-5, HIGH-6, MEDIUM-2/3/4).** Either (a) accept they are LLM-honored prose and say so plainly in the docs, or (b) add the small machine-checkable backstops suggested (a `validate-gate.sh` for NO-GO-before-Build, a state.json circuit-breaker helper, a plan.md hash, a standardized `approval` field, and `allowedTools` scoping for the Verifier). Option (b) converts five aspirational gates into the same tier as the proven delivery gate.
3. **If full live coverage is wanted, drive the self-contained url-shortener DEBUG fixture first — it is the cheapest live scenario.** It needs no greenfield market-research phase, the repro and fixed code already ship in-repo, and Tier E already proved the suite flips RED on the break. After reconciling HIGH-2 (so the concurrency test is treated as the pre-existing repro), an interactive DEBUG run only needs one human approval at the Diagnose→Fix gate (C4), making it the smallest path to exercising the builder≠verifier handoff, RED-rewind, and circuit-breaker live. GREENFIELD and LEGACY are larger and should follow once DEBUG passes live.
