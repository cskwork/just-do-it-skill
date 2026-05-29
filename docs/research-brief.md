# /just-do-it Harness — Design-Oriented Research Brief

**Scope:** One command (`/just-do-it`) that takes a single objective through a full, gated development process using expert subagents — three modes: GREENFIELD (new production app), DEBUG (root-cause hard bugs), LEGACY (add a feature inside a large codebase).

**Method note:** Findings synthesized from a verified claim set. Semantic duplicates merged. One claim was **REFUTED in verification and is excluded** from the evidence base: the "empirically 4–6x single-agent token overhead / ~40–50 lines per child" claim — its load-bearing numbers came from a single design RFC (openclaw #35203), were mislabeled "empirical," and were misattributed to Anthropic. Only its supported sub-fact survives (see Quality §).

Confidence ratings: **high** = multiple independent credible sources agree; **med** = supported but with single-source or framing caveats; **low** = directional only.

---

## 1. Orchestration

### Findings

1. **Task topology — not preference — dictates architecture.** Multi-agent fan-out wins on "wide-and-shallow" independent-thread work (research, data gathering, parallel module scaffolding); a single agent wins on "deep-and-narrow" work (one coherent feature, long-form refactor) where memory consistency and logical coherence matter. Cognition ("single agents only, for now," 12 Jun 2025) and Anthropic ("parallel agents work with guard-rails," <24h later) are *not* in conflict — they solve different task classes. Anthropic reported **90.2% improvement over single-agent Opus 4** on its research eval. **[high]** — Cognition/Anthropic debate analysis; LangChain "How and when to build multi-agent systems"; ctol.digital; arxiv 2601.04748.

2. **The converged 2026 consensus pattern is "orchestrator + isolated subagents with summary returns."** A planner/lead decomposes, spawns subagents with their own context/workspace, and each returns only a *compressed summary* — never its raw transcript — keeping the orchestrator's context clean. Anthropic, Cognition, OpenAI, AutoGen-via-MAF, and LangChain all converged on this shape. **[high]** — flowhunt.io; LangChain; blakecrosley.com agent-architecture guide.

3. **Role specialization (Planner/Architect/Coder/Debugger/Reviewer/Tester) is the dominant decomposition — its real value is isolating distinct cognitive modes, not just dividing labor.** Keeping designing, coding, critiquing, and testing in separate, role-scoped contexts stops a critic from inheriting the coder's rationalizations. Instantiated by research frameworks (AgentMesh, AgentCoder, AgileCoder) and products (Claude Code, Cursor, Devin). **[high]** — arxiv 2507.19902 (AgentMesh); fungies.io orchestration guide; aiautomationglobal.com.

4. **Hand-off protocol is a primary design lever and differs sharply by framework.** LangGraph = directed graph with a shared state object + reducers + checkpointing/time-travel (best for stateful, branching, error-recovery). OpenAI Agents SDK = explicit agent-to-agent handoffs carrying context (clean but model-locked, ephemeral). CrewAI = sequential task-output passing, no checkpointing. AutoGen = conversational GroupChat that replays accumulated history each turn (4 agents × 5 rounds = 20+ LLM calls). **[high]** — gurusup.com framework comparison; uvik.net; Medium (CrewAI/LangGraph/Swarm comparison).

5. **A shared blackboard coordinates subagents without point-to-point messaging — but pure isolation loses knowledge after a task, forcing redundant rework.** In blackboard systems the orchestrator posts a request and capable subagents self-select to contribute (arxiv 2510.01285 shows 13–57% gains over baselines). Full-isolation hierarchies discard discoveries when a task ends; a layered/persistent memory must complement isolation. **[med]** — caveats: "leading pattern" is editorializing (one strong pattern among several); the self-selection mechanism is from arxiv 2510.01285, not the emergentmind bMAS page (which describes a different top-down variant). arxiv 2510.01285; openclaw #35203; O'Reilly "Why multi-agent systems need memory engineering."

6. **Subagents should run with a locked model and a locked, role-scoped system prompt** for consistent, cost-predictable invocations. Recommended adoption path is incremental: start with one small skill, gate risky work behind read-only Plan Mode, add subagents for side tasks, connect MCP tools only as needed. **[high]** — developersdigest.tech (Claude Code agent teams 2026); antstack.com field guide; skywork.ai.

7. **Deterministic / hooks-based control beats relying on the model to self-police.** Use the framework/workflow for orchestration *shape*; use deterministic hooks, tests, and review gates for *truth*. Anthropic shipped Claude Managed Agents (public beta, Apr 2026: harness loop + tool execution + sandbox container + state persistence as a REST API); Praetorian describes a deterministic AI orchestration platform for autonomous development. **[med]** — antstack.com; praetorian.com; developersdigest.tech.

### Design implications for /just-do-it
- **Classify the task at entry** (parallelizable vs single-thread coherent). Fan out subagents only for the former; keep one driving agent for a cohesive feature build. Map: GREENFIELD scaffolding/research → fan-out; LEGACY feature + DEBUG → mostly single-thread with targeted helper subagents.
- **Default shape = one orchestrator that ingests only subagent summaries**, never full transcripts.
- **Define locked, role-scoped subagents** (plan, architect, code, review, QA), each pinned to a fixed model + fixed prompt, so a critic never inherits the coder's reasoning and cost stays predictable.
- **Prefer explicit graph-style handoffs with checkpointing** (LangGraph-like) over open-ended group chat; avoid AutoGen-style N-round debate loops that multiply token cost without bounded gates.
- **Add a shared artifact/blackboard** (a plan + findings file) that persists across subagent runs so discoveries survive task boundaries, while each subagent's working context stays isolated.
- **Encode phase gates as deterministic, non-LLM hook scripts** (tests/lint/build) so progress can't be hallucinated by an agent claiming success.
- **Insert a read-only Plan-Mode/approval checkpoint** before any write-phase fan-out begins.

---

## 2. Harnesses

### Findings

1. **Headline SWE-bench Verified scores are inflated by training-data contamination and defective tests.** Reported peaks (Claude Opus 4.5 ~80.9%, Claude 4 77.2%, GPT-5 74.9%, OpenHands ~72%) are unreliable: an OpenAI audit found every frontier model reproduced *verbatim* gold patches for some Verified tasks, **59.4% of hard tasks have flawed tests**, and OpenAI stopped reporting Verified in favor of **SWE-bench Pro**. UC Berkeley RDI manipulated 8 benchmarks to near-perfect scores without solving any task. **[high]** — localaimaster.com; morphllm.com/swe-bench-pro; arxiv 2509.16941; pebblous.ai trust report.

2. **Real-world autonomous completion rates are far below benchmark scores.** Answer.AI's Devin 1.0 eval on 20 real tasks: **14 fail / 3 pass / 3 inconclusive (~15% unassisted on complex tasks)**. Cognition's own SWE-bench setup: **79/570 ≈ 13.9%**. Devin 2.0 reaches 45.8% on Verified unassisted. Devin excels only on tasks with clear upfront requirements and verifiable outcomes (~4–8h junior-engineer scope). **[high]** — openaitoolshub.org Devin review; cognition.ai 2025 review; awesomeagents.ai SWE-bench leaderboard.

3. **The architect/editor split is a proven scaffolding win.** A strong reasoning model plans; a cheaper/precise model emits diffs. Aider's architect/editor pairing reached ~85% on its code-editing benchmark — higher than either model alone. **[med]** — *(claim source truncated in input; corroborated by Aider's published architect-mode benchmarks; treat exact figure as directional pending re-verification).*

4. **Managed harness primitives now exist as platform services.** Claude Managed Agents (Apr 2026 beta) packages the harness loop + tool execution + sandbox container + state persistence behind a REST API — i.e., the harness no longer has to be hand-rolled. **[med]** — antstack.com; developersdigest.tech.

5. **Plan Mode (read-only analysis → human approval before edits) is the recommended risk gate** for autonomous harnesses, paired with incremental tool connection. **[high]** — antstack.com; skywork.ai; developersdigest.tech.

### Design implications for /just-do-it
- **Never gate success on benchmark-style pass rates.** Gate on the *project's own test suite executed in a clean sandbox*. Treat any agent self-report of success as unverified until independently reproduced.
- **Scope work to small, well-specified, verifiable tasks by default.** Require an explicit, machine-checkable acceptance criterion *before* launch; degrade to human-in-loop for open-ended/ambiguous objectives. This directly bounds the DEBUG and LEGACY modes.
- **Consider an architect/editor split** inside each implementation subagent: a reasoning pass produces the plan/diff intent, a precise pass emits the actual edits.
- **Build on managed-harness primitives where available** (sandbox + state persistence) rather than reinventing the loop.
- **Make Plan Mode the default opening phase** for DEBUG and LEGACY (read-only root-cause / codebase mapping) before any write.

---

## 3. Market & Demand

### Findings

1. **Vendor positions converged within 24h, signaling a maturing market consensus rather than a contested frontier.** Cognition (single-agent caution) and Anthropic (guarded parallelism) publicly aligned that *the task picks the architecture* — the debate resolved into a shared design vocabulary by mid-2025. **[high]** — snrspeaks Medium debate analysis; ctol.digital.

2. **Realistic expectations are the live market story.** Public Devin evals (~14–15% unassisted on complex real tasks) reset buyer expectations away from "autonomous engineer" toward "supervised junior on bounded, verifiable work." Products that over-promise full autonomy face credibility risk; products scoped to verifiable tasks match demand. **[high]** — openaitoolshub.org; cognition.ai; Answer.AI eval.

3. **Benchmark distrust is now mainstream**, with OpenAI moving to SWE-bench Pro and audits exposing contamination — buyers increasingly discount headline scores. A harness that markets on *reproducible, project-local verification* differentiates against leaderboard-driven competitors. **[high]** — morphllm.com; arxiv 2509.16941; pebblous.ai.

> *Note: dedicated market-sizing/pricing claims were not present in the verified source set; the above are market-signal inferences drawn from the orchestration and harness evidence. Confidence reflects the underlying findings, not independent market research.*

### Design implications for /just-do-it
- **Position on verifiability, not benchmark scores** — "every claim of done is backed by a green test run in a clean sandbox."
- **Set honest expectations in the product surface**: `/just-do-it` is a supervised, gated delivery loop for bounded objectives, not a hands-off autonomous engineer.
- **Three explicit modes (GREENFIELD/DEBUG/LEGACY) match observed demand** for bounded, well-specified tasks; each should advertise its acceptance-criterion requirement up front.

---

## 4. Quality & Verification

### Findings

1. **Verification needs two distinct mechanisms because they measure different things.** Executable unit tests / SWE-bench-style pass rates measure *correctness* (best when tests are trustworthy); an LLM rubric (LLM-as-judge) measures *quality, readability, maintainability, security* that tests cannot capture. Anthropic explicitly uses unit tests for correctness **plus** an LLM rubric for overall code quality. **[high]** — arxiv 2506.17208; Medium (rubric-based evals); arxiv 2503.16416.

2. **Diversity of verifiers beats a single reviewer.** A committee of specialized review agents, each hunting a different defect class, provably finds more bugs than any single agent (Codex-Verify, four specialized agents). LLM-as-selector setups (one model choosing among candidate patches from several models) lift scores — TRAE reached **70.4%** (May 2025) selecting across Claude 3.7, Gemini 2.5 Pro, and o4-mini via o1. **[med]** — arxiv 2511.16708 (Codex-Verify); arxiv 2508.02994 (TRAE); arxiv 2506.17208.

3. **Token spend dominates multi-agent performance variance — but only this sub-fact is verified.** Anthropic's own data: *token usage alone explains ~80% of the variance* in BrowseComp, with tool-call count (~10%) and model choice (~5%) reaching ~95% across three factors. **[high for this sub-fact only].** ⚠️ The broader claim it was bundled with — "empirically 4–6x single-agent overhead, ~40–50 lines per child" — was **REFUTED** (single-RFC source, mislabeled empirical, misattributed to Anthropic) and is excluded. Anthropic's actual magnitude framing: single agents ~4x chat tokens, multi-agent ~15x chat tokens (≈3.75x single-agent, with a wide 3–10x independent range). — anthropic.com/engineering/multi-agent-research-system; O'Reilly; flowhunt.io. *(openclaw #35203 NOT cited as empirical.)*

4. **Defective tests are a real failure mode for test-based gates** (59.4% of SWE-bench hard tasks had flawed tests). A correctness gate is only as trustworthy as the suite it runs. **[high]** — arxiv 2509.16941; morphllm.com.

### Design implications for /just-do-it
- **Two-layered done-gate:** a **hard gate** (tests/build/lint must pass) and a **soft rubric gate** (reviewer subagent scores quality/security). *Never let the rubric override a failing test.*
- **Spawn parallel reviewers with distinct mandates** (correctness, security, style/maintainability) rather than one generic reviewer; optionally generate-then-select among candidate patches.
- **Budget for ~4x (single) to ~15x (multi) chat-token cost** and minimize per-subagent prompt boilerplate, since token spend is the dominant variance driver. Gate fan-out behind the task-topology check so deep-narrow tasks don't pay multi-agent cost.
- **Validate the test suite itself** (e.g., a mutation/sanity check, or require tests that fail before the fix) — a green run on a flawed suite is a false done.

---

## 5. Debugging (DEBUG mode)

### Findings

1. **DEBUG is "deep-and-narrow" work — keep it single-thread with targeted helpers, not a fan-out.** Root-causing one bug demands memory consistency and logical coherence across the whole reasoning chain; multi-agent isolation breaks the shared mental model. Use one driving agent, spawn isolated helpers only for genuinely independent sub-investigations (e.g., "search log corpus A" while "reproduce in env B"). **[high]** — Cognition single-agent guidance; LangChain task-topology framing.

2. **Read-only Plan Mode is the correct opening move for debugging.** Analyze and propose without mutating, get approval, then act — preventing speculative edits that corrupt the repro state. **[high]** — antstack.com; developersdigest.tech.

3. **A persistent findings blackboard prevents redundant re-investigation.** Full isolation loses discoveries when a sub-investigation ends, forcing re-research; a shared findings file lets the driving agent accumulate evidence across probes. **[med]** — openclaw #35203; O'Reilly memory-engineering.

4. **Reproduce-first, verify-in-clean-sandbox is the trustworthy gate** — the same anti-contamination, anti-flawed-test discipline applies: a bug is "fixed" only when a previously-failing repro now passes in a clean sandbox. **[high]** — arxiv 2509.16941; Anthropic verification practice.

5. **Diverse verifiers help confirm a fix doesn't regress other defect classes** (correctness + security + behavioral reviewers), mirroring the committee-of-reviewers result. **[med]** — arxiv 2511.16708.

### Design implications for /just-do-it (DEBUG mode)
- **Default DEBUG to single-driver topology**; allow isolated parallel probes only for independent investigations, each returning a summary to the blackboard.
- **Open with read-only Plan Mode**: reproduce → localize → hypothesize, approve, then fix.
- **Require a failing repro before the fix and a passing repro after**, executed in a clean sandbox — the literal delivery gate for DEBUG.
- **Run a post-fix regression review** with distinct mandates (does the fix break correctness/security/behavior elsewhere?).
- **Persist all findings to the shared vault** so re-runs and follow-ups don't re-investigate solved ground.

---

## Top 10 Design Decisions for /just-do-it

1. **Topology classifier at entry.** Branch GREENFIELD/LEGACY/DEBUG, then pick fan-out (wide-shallow: scaffolding, research) vs single-driver (deep-narrow: one feature, one bug). Don't pay multi-agent cost on coherent single-thread work. *(Orch-1, Debug-1)*

2. **Orchestrator + isolated subagents, summary-only returns.** One lead ingests compressed summaries, never raw transcripts — the converged 2026 pattern that keeps the lead's context clean. *(Orch-2)*

3. **Locked role-scoped subagents, pinned model + prompt.** Plan / Architect / Code / Review / QA as separate agents with frozen system prompts so critics never inherit coder rationalizations and cost is predictable. *(Orch-3,6)*

4. **Graph-style handoffs with checkpointing; ban open-ended debate loops.** LangGraph-like state object + reducers + checkpoints. No AutoGen-style N-round GroupChat that multiplies tokens without bounded gates. *(Orch-4)*

5. **Shared persistent blackboard (plan + findings vault).** Discoveries survive task boundaries; subagents self-select and post results; working contexts stay isolated. *(Orch-5, Debug-3)*

6. **Deterministic hook gates, not model self-policing.** Phase advancement requires non-LLM hook scripts (tests/lint/build) to pass — progress cannot be hallucinated. *(Orch-7)*

7. **Read-only Plan Mode + human approval before any write fan-out.** Mandatory opening phase for DEBUG and LEGACY; the risk gate for autonomous edits. *(Harness-5, Debug-2)*

8. **Two-layer done-gate: hard tests + soft rubric, tests win.** Build/lint/tests must pass (hard); a reviewer subagent scores quality/security (soft). Rubric never overrides a failing test. *(Quality-1)*

9. **Committee of diverse reviewers; optional generate-then-select.** Parallel reviewers with distinct mandates (correctness / security / maintainability) find more defects than one generic reviewer; optionally select among candidate patches. *(Quality-2)*

10. **Project-local verification in a clean sandbox is the only success signal — and validate the suite itself.** Never gate on benchmark scores or agent self-report. Require machine-checkable acceptance criteria; for DEBUG, a failing-then-passing repro. Guard against flawed tests (failing-before-fix requirement / sanity check). *(Harness-1,2; Quality-4; Debug-4)*

---

*Excluded from evidence base (verification = refuted):* "Multi-agent token overhead is empirically 4–6x single-agent … ~40–50 lines per child … token spend explains ~80% of variance." Only the 80%-variance sub-fact is retained and re-cited to Anthropic; the 4–6x / 40–50-line figures are single-RFC, mislabeled empirical, and misattributed — do not use.
