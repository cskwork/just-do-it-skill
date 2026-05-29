#!/usr/bin/env node
// /just-do-it circuit breaker — makes "same error 3x -> stop" machine-checkable.
//
// Usage: node circuit-breaker.mjs <state.json> <normalized-signature>
//   <state.json>            the run's state file
//   <normalized-signature>  the failure fingerprint the orchestrator computed for this cycle
//
// The caller MUST normalize the signature before passing it, so the same failure maps to the
// same key across cycles. Normalization rule (keep it identical everywhere):
//   first failing assertion message + file:line, lowercased, stack frames trimmed.
//
// Behavior: increments state.json.error_signatures[<sig>], persists, and exits 1 (TRIP) once that
// count reaches state.json.circuit_breaker_threshold (default 3). On a trip the orchestrator must
// STOP the retry loop, write the root cause to the run's README.md, and escalate to the user.
// Exit 2 = bad usage. Exit 0 = recorded, below threshold.

import { readFileSync, writeFileSync } from "node:fs";

const [statePath, signature] = process.argv.slice(2);
if (!statePath || !signature) {
  console.error("usage: circuit-breaker.mjs <state.json> <normalized-signature>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} catch (err) {
  console.error(`circuit-breaker: cannot read/parse ${statePath}: ${err.message}`);
  process.exit(2);
}

const threshold = Number.isInteger(state.circuit_breaker_threshold)
  ? state.circuit_breaker_threshold
  : 3;

state.error_signatures = state.error_signatures || {};
const count = (state.error_signatures[signature] || 0) + 1;
state.error_signatures[signature] = count;
writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");

if (count >= threshold) {
  console.log(
    `CIRCUIT-BREAKER TRIP: signature seen ${count}x (>= ${threshold}) — ` +
      `stop the retry loop, write the root cause to README.md, escalate to the user.`
  );
  process.exit(1);
}
console.log(`circuit-breaker: signature count ${count}/${threshold} — may retry`);
process.exit(0);
