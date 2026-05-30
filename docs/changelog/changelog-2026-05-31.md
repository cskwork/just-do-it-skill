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
