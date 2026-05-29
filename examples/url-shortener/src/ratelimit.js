// Per-key token-bucket rate limiter with lazy refill. `now` is injectable.

/**
 * @param {{capacity:number, refillPerSec:number, now?:()=>number}} opts
 */
export function createRateLimiter({ capacity, refillPerSec, now = Date.now }) {
  if (!(capacity > 0)) throw new RangeError("capacity must be > 0");
  if (!(refillPerSec > 0)) throw new RangeError("refillPerSec must be > 0");

  /** @type {Map<string, {tokens:number, last:number}>} */
  const buckets = new Map();

  /**
   * @param {string} key
   * @returns {{ok:true} | {ok:false, retryAfter:number}}
   */
  function allow(key) {
    const ts = now();
    const bucket = refill(buckets.get(key), ts);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return { ok: true };
    }

    buckets.set(key, bucket);
    const deficit = 1 - bucket.tokens;
    const retryAfter = Math.max(1, Math.ceil(deficit / refillPerSec));
    return { ok: false, retryAfter };
  }

  function refill(prev, ts) {
    if (!prev) return { tokens: capacity, last: ts };
    const elapsedSec = Math.max(0, (ts - prev.last) / 1000);
    const tokens = Math.min(capacity, prev.tokens + elapsedSec * refillPerSec);
    return { tokens, last: ts };
  }

  return { allow };
}
