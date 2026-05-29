#!/usr/bin/env bash
# /just-do-it GREENFIELD validate gate — the literal entry condition for Build.
# Build must NOT open until this exits 0. Parallel to delivery-gate.sh, it converts the
# "validate before build" rule from prose into a machine-checkable backstop.
# NEVER edit this script to make a NO-GO run pass — re-run Validate or stop instead.
#
# Usage: validate-gate.sh <vault-dir>
#   <vault-dir>  the run's changelog folder, e.g. docs/changelog/2026-05-30-my-objective
#
# Exit 0 only if brief.md carries an explicit `Decision: GO`. A NO-GO decision, or no
# Decision line at all, blocks Build (greenfield must produce a GO before any code is written).

set -euo pipefail

VAULT="${1:?usage: validate-gate.sh <vault-dir>}"
BRIEF="$VAULT/brief.md"
fail() { echo "VALIDATE-GATE FAIL: $*" >&2; exit 1; }

echo "== /just-do-it validate gate =="
echo "vault: $VAULT"

[ -s "$BRIEF" ] || fail "brief.md missing/empty — no validation was recorded"

# Match the explicit Decision line (plain or '## '-prefixed), not prose mentioning NO-GO criteria.
if grep -qiE '^(#+[[:space:]]*)?Decision:[[:space:]]*NO-?GO\b' "$BRIEF"; then
  fail "brief.md decision is NO-GO — Build must not open; stop and report"
fi
grep -qiE '^(#+[[:space:]]*)?Decision:[[:space:]]*GO\b' "$BRIEF" \
  || fail "no 'Decision: GO' line in brief.md — greenfield must validate (demand + scoped MVP + GO) before Build"

echo "  ok: Decision: GO"
echo "== VALIDATE GATE PASS =="
