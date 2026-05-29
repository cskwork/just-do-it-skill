import { test } from "node:test";
import assert from "node:assert/strict";
import { BASE62, base62Encode, generateCode } from "../src/codec.js";

const BASE62_RE = /^[0-9A-Za-z]+$/;

test("generateCode: 10000 codes are base62, length>=7, and unique", () => {
  const seen = new Set();
  for (let i = 0; i < 10000; i++) {
    const code = generateCode();
    assert.ok(BASE62_RE.test(code), `not base62: ${code}`);
    assert.ok(code.length >= 7, `too short: ${code}`);
    assert.equal(code.length, 7, "default length should be 7");
    assert.ok(!seen.has(code), `duplicate code: ${code}`);
    seen.add(code);
  }
  assert.equal(seen.size, 10000);
});

test("generateCode: honors a custom length and only emits alphabet chars", () => {
  const code = generateCode(12);
  assert.equal(code.length, 12);
  for (const ch of code) assert.ok(BASE62.includes(ch));
});

test("generateCode: rejects invalid lengths", () => {
  assert.throws(() => generateCode(0), RangeError);
  assert.throws(() => generateCode(-1), RangeError);
  assert.throws(() => generateCode(1.5), RangeError);
});

test("base62Encode: encodes integers correctly", () => {
  assert.equal(base62Encode(0), "0");
  assert.equal(base62Encode(61), "z");
  assert.equal(base62Encode(62), "10");
  assert.throws(() => base62Encode(-1), RangeError);
});
