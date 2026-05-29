import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/ratelimit.js";

test("capacity 3 refill 1/s: 3 allowed then blocked, then refills", () => {
  let clock = 1_000_000;
  const rl = createRateLimiter({ capacity: 3, refillPerSec: 1, now: () => clock });

  assert.equal(rl.allow("k").ok, true);
  assert.equal(rl.allow("k").ok, true);
  assert.equal(rl.allow("k").ok, true);

  const blocked = rl.allow("k");
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0, "retryAfter must be positive");

  // Advance 1s -> exactly one token refilled.
  clock += 1000;
  assert.equal(rl.allow("k").ok, true);
  assert.equal(rl.allow("k").ok, false);

  // Advance enough to fully refill.
  clock += 10_000;
  assert.equal(rl.allow("k").ok, true);
});

test("buckets are independent per key", () => {
  let clock = 0;
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 1, now: () => clock });
  assert.equal(rl.allow("a").ok, true);
  assert.equal(rl.allow("a").ok, false);
  assert.equal(rl.allow("b").ok, true); // separate bucket
});

test("retryAfter scales with deficit", () => {
  let clock = 0;
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 0.5, now: () => clock });
  assert.equal(rl.allow("k").ok, true);
  const r = rl.allow("k");
  assert.equal(r.ok, false);
  assert.ok(r.retryAfter >= 2, "0.5/s refill -> ~2s to regain a token");
});

test("rejects invalid construction", () => {
  assert.throws(() => createRateLimiter({ capacity: 0, refillPerSec: 1 }), RangeError);
  assert.throws(() => createRateLimiter({ capacity: 1, refillPerSec: 0 }), RangeError);
});
