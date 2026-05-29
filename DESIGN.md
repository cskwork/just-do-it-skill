# /just-do-it — design rationale

Why each part is built the way it is. Sources: the cloned `oh-my-symphony` repo (concept/workflow),
the local symphony/autopilot/ultrawork/ultraqa/ultragoal skills (reusable mechanisms), and a
fact-checked web research brief (`docs/research-brief.md`, 18 agents, adversarially verified).

## Borrowed from oh-my-symphony (concept + workflow)

oh-my-symphony is a polling orchestrator that dispatches coding-CLI agents at a Kanban board, each
ticket in its own git worktree, observed via a TUI. Its OneShot path turns one prompt into ordered
tickets through Brief → Plan → Build → Verify → QA → Polish → Deliver.

**Borrowed (the ideas):** forward-only gated lanes; a single shared **vault** as the only cross-phase
state; **`claims.md` untrusted + adversarial Verify** that re-runs every claim; **role separation by
read-scope**; the **literal-bash delivery gate** that is never edited to pass.

**Deliberately dropped (the infra):** the Symphony CLI/service/TUI, per-ticket git worktrees, and
external WORKFLOW files. `/just-do-it` runs **self-contained with in-session `Task` subagents** — no
install, no ports, no poller. (Reuse-map decision: borrow gate ideas, skip the heavyweight machine.)

**Gap closed:** oh-my-symphony has **no demand-validation step** (grep across its repo: zero matches
for market/product validation). `/just-do-it` adds a **Validate** front-lane for GREENFIELD.

## Reused from local skills

- **autopilot** → phase pipeline + artifact-skip gates + bounded-retry circuit breaker + multi-expert
  parallel validation before delivery.
- **ultraqa** → diagnose→fix split (Opus diagnoses, Sonnet fixes) + same-error-3× circuit breaker.
- **ultrawork** → parallel-wave dispatch + tiered model routing (Haiku/Sonnet/Opus) + background >30s.
- **using-symphony** → `doctor`-style preflight discipline.
- **Frontmatter/house style** → `name` + trigger-rich `description` + `argument-hint` + `level`;
  thin `SKILL.md` spine + `reference/*.md` loaded on demand (progressive disclosure).

## Grounded by research (each decision → evidence)

| Decision | Evidence |
|---|---|
| Topology classifier: fan-out only for wide-shallow; single-driver for deep-narrow (DEBUG/LEGACY) | Cognition + Anthropic mid-2025 convergence; LangChain task-topology |
| Orchestrator ingests subagent **summaries**, never raw transcripts | Anthropic multi-agent system; flowhunt.io; LangChain |
| Locked role-scoped subagents, pinned model+prompt (critic ≠ coder context) | arxiv 2507.19902 AgentMesh; arxiv 2506.17208 |
| Read-only Plan Mode + approval before writes (DEBUG/LEGACY) | antstack.com; developersdigest.tech |
| **Two-layer gate**: hard tests (deterministic) + soft LLM rubric; rubric never overrides red tests | arxiv 2506.17208 (Anthropic uses both) |
| Committee of diverse reviewers (correctness/security/maintainability) | arxiv 2511.16708 Codex-Verify; arxiv 2506.17208 |
| Gate on the project's own suite in a clean sandbox, never benchmarks/self-report | SWE-bench contamination — arxiv 2509.16941; morphllm.com SWE-bench Pro |
| Validate the suite itself (failing-before requirement / mutation check) | 59.4% of SWE-bench hard tasks have flawed tests — arxiv 2509.16941 |
| DEBUG = reproduce-first (red), root-cause, passing-after in clean sandbox | Anthropic verification practice; arxiv 2509.16941 |
| Honest product stance: supervised gated loop, not autonomous engineer | Devin ~14-15% unassisted on complex tasks — Answer.AI; cognition.ai |
| Cost: token spend ≈80% of multi-agent variance → gate fan-out, trim boilerplate | Anthropic multi-agent system |

**Excluded (refuted in verification):** the "4-6× single-agent token overhead / ~40-50 lines per
child" figures — single-RFC, mislabeled empirical, misattributed. Only Anthropic's ~80%-variance
sub-fact is retained.

## Verification of this skill

The one piece of executable code, `templates/delivery-gate.sh`, was tested across 5 scenarios
(missing artifacts → FAIL; complete+GREEN+passing → PASS; RED verdict → FAIL; NO-GO → FAIL; failing
suite → FAIL). All behaved as specified — the gate genuinely gates.

### Live end-to-end validation (2026-05-29)
Ran a full GREENFIELD pipeline on a real production-grade objective ("build a production URL
shortener service and ship it"): Validate(GO) → Plan(frozen) → Build → Verify → Committee → QA →
Deliver. The harness paid off exactly where designed — the **builder≠verifier separation caught real
bugs the builder's own 43 green tests missed**:
- Verify cycle 1 → RED: 2 genuine SSRF bypasses (`[::ffff:127.0.0.1]` IPv6-mapped loopback,
  `localhost.` trailing-dot) → rewind to Build → fixed → Verify cycle 2 GREEN.
- Committee (architect/security/code-review all APPROVE) surfaced 1 MEDIUM (malformed
  percent-encoding → unauth 500) → fixed → Verify cycle 3 GREEN.
- QA 11/11 black-box, then `delivery-gate.sh` exit 0 (51/51 tests in clean state), then commit.
A single unrouted agent would almost certainly have shipped the SSRF holes on a "43 tests pass".

### Live DEBUG-mode validation (2026-05-29)
A realistic lost-update race was injected into the shortener's `incrementHit` (read hoisted out of
the mutex) as a debugging-drill fixture; the bug was left UNCOMMITTED (an earlier attempt to disguise
it as a "perf" commit was correctly blocked by the content-integrity classifier — the deceptive commit
was reverted, not worked around). The DEBUG harness, given only the symptom ("popular links undercount
hits under concurrency"), ran single-driver + read-only Plan Mode: reproduced (200 concurrent →
1/200), root-caused with competing hypotheses + a git-stash discriminating probe, **stopped at the
approval gate**, then fixed + adversarially verified (52/52 + 10 concurrency trials, 0 lost). Committed
as `0ce82a1`.

### Live LEGACY-mode validation (2026-05-29)
Added optional link expiry (TTL) to the now-real codebase. Explore mapped the change surface
(file:line) read-only; a frozen surgical plan was approved at the gate (expired → 410 Gone); Build
implemented it; adversarial Verify confirmed **no regression** (redirect still counts hits after the
get→increment reorder, the DEBUG concurrency guard still 200/200, unknown still 404, legacy records
with no `expiresAt` never expire) at 68/68; security + code-review committee APPROVE (LOW only); gate
green. Committed as `b2c897f`. Demonstrated the LEGACY-specific value: backward-compat + surgical
blast radius + regression-safety on top of existing tests.

All three modes are live-validated. Adversarial verification caught a real defect in 2 of 3 runs
(SSRF + concurrency race); the LEGACY run shipped clean because Explore-first + a frozen surgical plan
kept the change correct on the first build.
