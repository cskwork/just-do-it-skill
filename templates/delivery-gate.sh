#!/usr/bin/env bash
# /just-do-it literal delivery gate.
# The orchestrator may NOT announce "done" unless this exits 0.
# NEVER edit this script to make a failing run pass — fix the work instead.
#
# Usage: delivery-gate.sh <vault-dir> [test-command]
#   <vault-dir>     e.g. ./.just-do-it/my-objective
#   [test-command]  optional; if omitted, auto-detected from the project
#
# Exit 0 only if: required vault artifacts exist, verification is GREEN with no RED,
# and the project's own test/build suite passes in this workspace.

set -euo pipefail

VAULT="${1:?usage: delivery-gate.sh <vault-dir> [test-command]}"
TEST_CMD="${2:-}"
fail() { echo "GATE FAIL: $*" >&2; exit 1; }
pass() { echo "  ok: $*"; }

echo "== /just-do-it delivery gate =="
echo "vault: $VAULT"

# 1) Required artifacts exist and are non-empty.
[ -s "$VAULT/brief.md" ]        || fail "brief.md missing/empty"
[ -s "$VAULT/plan.md" ]         || fail "plan.md missing/empty (scope was never frozen)"
[ -s "$VAULT/verification.md" ] || fail "verification.md missing/empty (nothing was verified)"
pass "artifacts present"

# 2) Verification is GREEN and contains no RED verdict.
grep -qi '^verdict:[[:space:]]*GREEN' "$VAULT/verification.md" \
  || fail "no 'verdict: GREEN' line in verification.md"
if grep -qi '^verdict:[[:space:]]*RED' "$VAULT/verification.md"; then
  fail "a 'verdict: RED' remains in verification.md — Verify rewound to Build and never cleared"
fi
pass "verification GREEN, no RED"

# 3) GREENFIELD only: a GO decision must exist (NO-GO must never reach delivery).
if [ -f "$VAULT/validation.md" ]; then
  grep -qiE '\b(GO)\b' "$VAULT/validation.md" || fail "validation.md present but no GO decision"
  if grep -qiE '\bNO-?GO\b' "$VAULT/validation.md"; then
    fail "validation.md says NO-GO — building on spec is forbidden"
  fi
  pass "validation GO"
fi

# 4) Run the project's own suite in this workspace (the real correctness signal).
if [ -z "$TEST_CMD" ]; then
  if [ -f package.json ];        then TEST_CMD="npm test --silent"
  elif [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -f setup.cfg ]; then TEST_CMD="pytest -q"
  elif [ -f go.mod ];            then TEST_CMD="go test ./..."
  elif [ -f Cargo.toml ];        then TEST_CMD="cargo test"
  elif [ -f Makefile ] && grep -q '^test:' Makefile; then TEST_CMD="make test"
  else fail "no test command given and none auto-detected — pass one explicitly; a build with no tests cannot be delivered"
  fi
fi
echo "  running: $TEST_CMD"
eval "$TEST_CMD" || fail "test suite did not pass: $TEST_CMD"
pass "test suite green"

echo "== GATE PASS =="
