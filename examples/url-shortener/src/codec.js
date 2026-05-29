// Base62 utilities and collision-resistant short-code generation.
import { randomBytes } from "node:crypto";

export const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const RADIX = BASE62.length; // 62

/**
 * Generate a random base62 code of `len` chars (default 7).
 * Uses rejection sampling on random bytes for an UNBIASED mapping:
 * a byte (0..255) is only accepted when it falls in the largest range
 * that is an exact multiple of 62, so every alphabet char is equiprobable.
 * @param {number} len
 * @returns {string}
 */
export function generateCode(len = 7) {
  if (!Number.isInteger(len) || len < 1) {
    throw new RangeError("code length must be a positive integer");
  }
  const maxUnbiased = 256 - (256 % RADIX); // 248: bytes 248..255 are rejected
  let out = "";
  while (out.length < len) {
    const bytes = randomBytes(len - out.length);
    for (const b of bytes) {
      if (b < maxUnbiased) out += BASE62[b % RADIX];
    }
  }
  return out;
}

/**
 * Encode a non-negative integer as base62 (useful for numeric ids).
 * @param {number|bigint} value
 * @returns {string}
 */
export function base62Encode(value) {
  let n = typeof value === "bigint" ? value : BigInt(value);
  if (n < 0n) throw new RangeError("value must be non-negative");
  if (n === 0n) return BASE62[0];
  const big = BigInt(RADIX);
  let out = "";
  while (n > 0n) {
    out = BASE62[Number(n % big)] + out;
    n /= big;
  }
  return out;
}
