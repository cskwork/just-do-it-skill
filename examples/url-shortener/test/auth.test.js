import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuth } from "../src/auth.js";

test("accepts a configured key, rejects wrong key", () => {
  const auth = createAuth({ keys: ["secret-key-1", "secret-key-2"] });
  assert.equal(auth.check("secret-key-1"), true);
  assert.equal(auth.check("secret-key-2"), true);
  assert.equal(auth.check("wrong"), false);
});

test("fails closed when no keys configured", () => {
  const auth = createAuth({ keys: [] });
  assert.equal(auth.check("anything"), false);
  assert.equal(createAuth({}).check("anything"), false);
});

test("never throws on length mismatch or odd input", () => {
  const auth = createAuth({ keys: ["abc"] });
  assert.equal(auth.check("ab"), false);
  assert.equal(auth.check("abcd"), false);
  assert.equal(auth.check(""), false);
  assert.equal(auth.check(undefined), false);
  assert.equal(auth.check(null), false);
  assert.equal(auth.check(12345), false);
});

test("ignores empty configured keys", () => {
  const auth = createAuth({ keys: ["", "  ".trim(), "real"] });
  assert.equal(auth.check(""), false);
  assert.equal(auth.check("real"), true);
});
