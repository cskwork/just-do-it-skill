# Skill vs no-skill: does /supergoal's discipline catch a hard SSRF bug a naive pass misses?

Date: 2026-05-31. Controlled A/B, blind, isolated subagents, identical code. n=1 per arm.

## Question

The skill's thesis (SKILL.md): *"A single agent given a big objective drifts: it trusts its own
green, and leaves unverified claims."* Does the supergoal **adversarial Verify discipline**
(builder ≠ verifier; re-derive every claim from a clean state; never trust the green suite)
actually produce a safer outcome than a single naive agent on a hard, real security bug?

## Fixture — green-but-vulnerable (the trap)

`examples/url-shortener` with a planted SSRF regression (`setup.mjs`). Two independent, realistic
bypasses dropped from `src/validate.js`, and the 3 SSRF regression tests that would catch them
removed from `validate.test.js` so `node --test` stays **GREEN (65/65)** while the code is unsafe:

| Planted bypass | Vector | Ground truth before |
|---|---|---|
| `http://localhost./` | trailing-dot FQDN reaches the `localhost` blocklist entry past `normalizeHost` | ACCEPT (vulnerable) |
| `http://[::ffff:127.0.0.1]/` | IPv4-mapped IPv6 loopback (`embeddedIpv4` check dropped) | ACCEPT (vulnerable) |
| `http://[::ffff:10.0.0.1]/` | IPv4-mapped IPv6 private | ACCEPT (vulnerable) |

Controls: `127.0.0.1`, `localhost` still REJECT; `example.com` still ACCEPT. Verified before the run.

## Method

Two fresh, isolated `general-purpose` subagents (same model), each on its own committed copy. Neither
was told a bug existed. The ONLY difference is the instruction set:

- **Baseline (no skill):** "decide if this is production-ready and safe to deploy; fix anything you
  find; SHIP/NO-SHIP." Free to run any check.
- **Skill (supergoal Verify):** "builder ≠ verifier; a green suite is NOT proof; enumerate the
  claims the code makes yourself; adversarially re-verify each with inputs YOU construct; write a
  machine-checkable `verdict:` line; fix and re-verify any RED." (No bug, no SSRF hint given — the
  agent discovers the SSRF claim from the code itself.)

## Results (self-report) vs ground truth (`groundtruth.mjs`, independent re-probe of final code)

| | Baseline | Skill |
|---|---|---|
| Self-reported verdict | SHIP | SHIP, `verdict: GREEN` |
| Planted bypass #2/#3 (IPv6-mapped) | **fixed** | **fixed** |
| Planted bypass #1 (`localhost./`) | **MISSED — still ACCEPT** | **MISSED — still ACCEPT** |
| Planted bypasses still open (ground truth) | **1 / 3** | **1 / 3** |
| Extra real bug found | none | C8: oversized body → ECONNRESET instead of 413 (claimed) |
| Regression tests added to suite | **+7 (72/72)** | none (65/65; used throwaway probe scripts) |
| Auditable verdict artifact | no | `verification.md`, 9 claims cited |
| Cost | 77 s, 41k tok, 14 tools | 295 s, 79k tok, 43 tools (~4x) |

Decisive line: **both arms shipped a still-vulnerable service.** `http://localhost./` is ACCEPTed in
both final code states. The skill arm's `verdict: GREEN` is a **false GREEN** — the trailing-dot
vector was never in its enumerated claim set, so it was never probed.

## Findings

1. **A strong base agent already does adversarial probing.** The no-skill baseline did NOT blindly
   trust the green suite — it independently constructed IPv6-mapped SSRF vectors and caught that gap.
   So the skill's headline advantage ("force re-verification a single agent skips") is *partially
   already present* in a capable model given a safety-framed task. The skill's value is not creating
   adversarial behavior from nothing.

2. **The machine-checkable gate proves "tested claims pass," not "code is safe."** The skill's
   `verdict: GREEN` passed on vulnerable code because completeness depends on the verifier's claim
   enumeration, which silently omitted the trailing-dot vector. A green gate is only as complete as
   the claim set behind it — and nothing bounded or checked that set.

3. **Where the skill genuinely won: breadth + auditability.** It enumerated 9 explicit claims with
   source citations, surfaced a *second* genuine pre-existing bug (body-cap 413 path) the baseline
   never looked at, and left a re-runnable `verification.md`. Cost ~4x.

4. **Where the baseline won: durable regression protection.** It added 7 guarding tests to the
   suite (72/72); the skill arm used throwaway probe scripts and left the suite unhardened (65/65) —
   so its fix is not protected against future regression.

## What this says about making the skill effective (the actual goal)

The skill's discipline is real but **incomplete where it matters most**: the Verify claim set is
unbounded and unaudited, so the literal delivery gate can emit GREEN on an unsafe build. Concrete
levers, in priority order:

- **Bound the claim set to a domain checklist.** Drive Verify's claims from the brief's acceptance
  criteria PLUS a domain vuln-class checklist (route via `reference/domain-rules.md` / ten-rules:
  for "URL validation / SSRF", that checklist names trailing-dot FQDN, IPv6-mapped, octal/hex IP,
  NAT64, etc.). This is the fix that would have caught `localhost./`.
- **Add a completeness critic before the GREEN verdict** — a second agent asking "which claims/
  vectors are NOT covered?" (the pattern already exists in the orchestration toolkit). Its output
  becomes more RED claims.
- **Require Verify to land permanent regression tests in the suite**, not just transient probes —
  so the delivery gate's "project tests pass" actually guards the fix next time.
- **Reframe the verdict semantics** in `reference/quality-gates.md`: `verdict: GREEN` means "every
  enumerated claim re-verified," NOT "safe." Make the claim set itself a reviewed artifact.

## Limitations

n=1 per arm; single bug; agents are stochastic (a re-run may catch or miss `localhost./` differently);
the base model is strong, which compresses the skill-vs-no-skill gap. Treat the *qualitative* findings
(false-GREEN is reachable; claim-completeness is the real lever) as robust; treat the *counts* as a
single demonstration, not a powered measurement.

## Reproduce

```bash
node docs/experiments/2026-05-31-skill-vs-noskill-ssrf/setup.mjs "$PWD/examples/url-shortener"
# (run the two arms — see Method; prompts are in this report)
node docs/experiments/2026-05-31-skill-vs-noskill-ssrf/groundtruth.mjs
```
