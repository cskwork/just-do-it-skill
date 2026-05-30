# Domain rules — the priority digest (advisory)

For a domain-specific objective, the run carries a compact set of **≤10 abstract priority rules** for
its domain so every phase builds to that domain's standard. Sourced from the `ten-rules` skill (the
"10 rules" reference sets). **Advisory**: it shapes Plan/Build/Review quality — it never replaces or
overrides the hard gates in `quality-gates.md`. A passing `delivery-gate.sh` is still required; the
digest is not machine-checked.

## Produce it at Step 0 / Intake

1. **Route.** Match the objective to its `ten-rules` domain(s). If the `ten-rules` skill is available,
   invoke it (it routes and supplies each domain `INDEX.md`); otherwise derive the domain from first
   principles. Several may apply (e.g. an LLM checkout page = ai-engineering + ecommerce-retail +
   web-design) — layer them.
2. **Distill.** Write **≤10 one-line, principle-level rules** — abstract and malleable, not
   task-specific steps. Multiple domains → merge to ≤10 total, keeping the highest-leverage.
3. **Record once.** Append a `## Priority Rules` block to the run's `README.md` (conductor-owned audit
   log — see `vault.md`). Hold it in the conductor context for the whole run.

## Apply it (advisory, per role)

The conductor injects the **role-relevant subset** into each subagent's locked prompt (`DO:` line in
`experts.md`) — no vault read-scope widens:

- **Architect (Plan)** — shape `plan.md` to satisfy the rules.
- **Builder** — honor them while implementing.
- **Committee (architect / code-reviewer)** — confirm the diff respects them; flag violations as findings.
- **NOT the Verifier** — it stays claims + source only; rules are not a pass/fail gate.

## Verify coverage checklist (gated — distinct from the advisory digest)

The Priority Rules digest above is advisory. Verify ALSO derives a **coverage checklist** from the same
domain routing — the concrete property/risk classes for **that** domain, whatever `ten-rules` surfaces:
a UI objective → a11y + responsive + error/empty states; a data pipeline → idempotency + schema
evolution + PII; an API → every error path + auth ordering; a security-sensitive input → the full
bypass family (the SSRF example in `quality-gates.md`). Unlike the digest, this checklist **is**
reflected in the gated **`## Coverage`** section of `verification.md` (`reference/quality-gates.md`):
every item is mapped to evidence or named under `Not covered:` with a justification. The digest shapes
quality; the checklist bounds verification completeness so a property is never dropped by silence.

## Conservative update

The digest is frozen-ish: refine only when the objective or plan materially changes, keep rules
abstract, and log the reason in `README.md` with a `RULES-UPDATE:` line (mirrors `RE-PLAN:`). Do not
churn wording run-to-run.

## Format (in `README.md`)

```md
## Priority Rules
Domain(s): <e.g. web-design + ecommerce-retail>  (source: ten-rules)
1. <abstract one-line rule>
...
10. <abstract one-line rule>
```
