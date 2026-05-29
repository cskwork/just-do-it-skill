# Quality gates — what "production-ready" means

The load-bearing concern in agentic coding is **verification**, not generation. Benchmark scores are
discredited (training-data contamination; **59.4% of SWE-bench hard tasks have flawed tests**; OpenAI
retired SWE-bench Verified for SWE-bench Pro — arxiv 2509.16941; morphllm.com). Real autonomous
completion runs ~14-15% on complex tasks. So: **never gate on benchmarks or the agent's own claim of
success. Gate only on the project's own tests, run in a clean sandbox.**

## The two-layer done-gate

Verification needs two mechanisms because they measure different things (Anthropic uses both —
arxiv 2506.17208):

### 1. Hard gate — correctness (deterministic, non-LLM)
Build + lint + the project's test suite must pass. This is `templates/delivery-gate.sh` — a literal
shell script that exits non-zero on any failure. The agent **cannot mark done unless it exits 0**,
and **must never edit the gate to make it pass** (oh-my-symphony Deliver-gate invariant). Paste the
real output as evidence.

### 2. Soft gate — quality (LLM rubric / committee)
A committee of reviewers with distinct mandates (correctness / security / maintainability) scores
quality, readability, and security that tests can't capture — a diverse committee finds more defects
than one generic reviewer (arxiv 2511.16708; arxiv 2506.17208). See `experts.md`.

**The rule that orders them: the soft gate can NEVER override a failing hard test.** A glowing review
on red tests is still a failure.

## Adversarial Verify (the builder does not grade its own homework)

`claims.md` is untrusted. A fresh `verifier`/`critic` agent — adversary to the claims, read-only on
the code's intent — re-runs every `run-to-prove` command **from a clean state** and writes
`verdict: GREEN|RED` to `verification.md`. Any RED rewinds to Build. (oh-my-symphony Verify lane.)

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
