# Quality gates — what "production-ready" means

The load-bearing concern in agentic coding is **verification**, not generation. Benchmark scores are
discredited (training-data contamination; **59.4% of SWE-bench hard tasks have flawed tests**; OpenAI
retired SWE-bench Verified for SWE-bench Pro — arxiv 2509.16941; morphllm.com). Real autonomous
completion runs ~14-15% on complex tasks. So: **never gate on benchmarks or the agent's own claim of
success — gate on the project's own tests, independently re-run by a fresh Verify agent from a clean
state.**

## The two-layer done-gate

Verification needs two mechanisms because they measure different things (Anthropic uses both —
arxiv 2506.17208):

### 1. Hard gate — correctness (deterministic, non-LLM)
Build + lint + the project's test suite must pass. This is `templates/delivery-gate.sh` — a literal
shell script that exits non-zero on any failure. The agent **cannot mark done unless it exits 0**,
and **must never edit the gate to make it pass**. Paste the
real output as evidence. The script runs the suite in the **current workspace** — it does not create
an isolated sandbox; reproducing from a genuinely clean state is the Verify agent's job (below).

**GREENFIELD Validate gate** (mirrors the delivery gate, but at pipeline entry): `templates/validate-gate.sh <vault>` exits 0 only when `brief.md` contains a `Decision: GO` line. NO-GO or absence exits non-zero — Build does not open. Never edit it to pass.

**Human Feedback gate** (before the first implementation write): `templates/human-feedback-gate.mjs <vault> <Build|Fix>` exits 0 only when `plan.md` contains the required two-part Human Feedback packet and `state.json.approval.status` is `APPROVED` for the target phase. The orchestrator must ask the human and wait; it must not self-approve.

**Plan-freeze check** (enforced at Deliver entry): plan-hash must match `state.json.plan_hash` (see `reference/vault.md`). A mismatch fails the gate unless `README.md` contains a logged re-plan step.

### 2. Soft gate — quality (LLM rubric / committee)
A committee of reviewers with distinct mandates (correctness / security / maintainability) scores
quality, readability, and security that tests can't capture — a diverse committee finds more defects
than one generic reviewer (arxiv 2511.16708; arxiv 2506.17208). See `experts.md`.

**The rule that orders them: the soft gate can NEVER override a failing hard test.** A glowing review
on red tests is still a failure.

## Adversarial Verify (the builder does not grade its own homework)

`claims.md` is untrusted. A fresh `verifier`/`critic` agent — adversary to the claims, read-only on
the code's intent — re-runs every `run-to-prove` command **from a clean state** and writes
`verdict: GREEN|RED` to `verification.md`. Any RED rewinds to Build.

**Clean state = a fresh `git worktree`** at the build commit (`git worktree add <tmp> <ref>`), not the
builder's working tree — it excludes uncommitted edits, stray build artifacts, and local config, so a
pass proves the *committed* code works. git is already present (no install); remove the worktree after.

## Completeness — bound and audit the claim set (a GREEN verdict ≠ "safe")

Adversarial re-verification only proves the claims you *thought to make*. The dangerous failure is the
claim you never enumerated — a vector, flow, or property silently absent from `claims.md`, so the
verdict reads GREEN while the property is broken (the **false-GREEN** failure mode). Four mechanisms
bound it; the first is machine-enforced by `delivery-gate.sh`.

### 1. Coverage map (required; gated)
Before the aggregate verdict, Verify writes a **`## Coverage`** section in `verification.md` mapping
each item of a **required-coverage list** to the evidence that proved it. The list = the brief's
acceptance criteria **plus** a **domain vuln/property checklist** for the objective's domain(s), routed
via `ten-rules` (`reference/domain-rules.md`). The verification must also carry:
- a **`Not covered:`** line naming every required item NOT verified, each with a one-line justification
  (or `Not covered: none`), and
- a **`Regression tests:`** line listing the permanent tests added for any fixed RED (or `none` for a
  verify-only run).
`delivery-gate.sh` fails if any of the three is missing — silent omission is no longer possible.

### 2. Completeness critic (before GREEN)
A fresh **completeness-critic** agent (no access to `claims.md`'s rationale) is dispatched against the
required-coverage list with one job: *name what is NOT covered* — missing vectors, untested flows,
unstated assumptions. Each gap is a new RED (reopen Build/Fix) or an explicit, justified entry in
`Not covered:`. This is the autopilot "completeness critic" pattern wired into the gate.

### 3. The coverage checklist is whatever the domain demands (not a fixed list)
The required-coverage list is **derived per objective, never hardcoded**: brief acceptance criteria +
the domain's own property/risk classes from `ten-rules` (`reference/domain-rules.md`). The mechanism is
domain-agnostic — *enumerate the properties this kind of work can silently break, then prove or name
each.* `delivery-gate.sh` enforces only that the `## Coverage` / `Not covered:` / `Regression tests:`
sections exist; **what fills them comes from the objective's domain**, e.g.:

| Objective domain | Example coverage classes the list must name |
|---|---|
| UI / front-end | a11y (keyboard, contrast, labels), responsive breakpoints, empty/error/loading states, RTL |
| Data pipeline / ETL | idempotency, schema evolution, partial-failure & backfill, PII handling, row ordering |
| API / service | every status & error path, auth-before-logic ordering, rate-limit, pagination bounds |
| Concurrency / state | lost-update, ordering, reentrancy, cleanup-on-failure |
| CLI / tool | exit codes, stdin/stdout/stderr contract, flag combinations, missing-arg behavior |
| Security / input validation | the full bypass *family*, not one case — e.g. SSRF: private/loopback IPv4, IPv4-mapped/compat IPv6, trailing-dot FQDN, octal/hex/decimal encodings, NAT64 |

A checklist that omits a class for the active domain must say so under `Not covered:` with a
justification — it cannot pass by silence. (The security row is the worked example that motivated this
gate: a trailing-dot FQDN bypass slipped a GREEN verdict in
`docs/experiments/2026-05-31-skill-vs-noskill-ssrf`; the mechanism is identical for any domain above.)

### 4. High-risk claims get a diverse verifier panel
For claims tagged **high-severity** (security, data-loss, concurrency/ordering, auth), one verifier is
not enough. Dispatch **≥3 verifiers with distinct lenses** — correctness, security, and "does it
actually reproduce" — and take a **majority RED → RED**. Diverse lenses beat redundant same-lens votes
(`reference/experts.md`). Cost-gate this to high-severity claims only.

## Validate the suite itself (a green run on a flawed suite is a false done)

Because flawed tests are a real failure mode (59.4% figure above), don't trust a suite blindly:
- **Failing-before requirement**: for a bug fix or a new behavior, the test must **fail before** the
  change and **pass after**. A test that passes on unfixed code proves nothing.
- **Sanity / mutation spot-check**: confirm the test actually exercises the new code path (e.g.
  temporarily break the impl → the test should go red). Note the check in `verification.md`.

## Maintainability gates (avoid AI slop)

Run the `ai-slop-cleaner` discipline before Deliver. Enforce the repo's own standards (here: functions
< 50 lines, files < 800, nesting ≤ 4, no hardcoded secrets, immutable patterns, specific types — see
the project rules). No dead code, no speculative abstractions, no unrelated reformat churn.

## Cost note

Token spend explains ~80% of multi-agent performance variance (Anthropic). Multi-agent runs cost
~15x chat tokens vs ~4x for single-agent (≈3.75x, wide 3-10x range). Minimize per-subagent prompt
boilerplate and gate fan-out behind the topology check so deep-narrow work doesn't pay multi-agent
cost. (The refuted "4-6x / 40-50 lines per child" figures are NOT used.)
