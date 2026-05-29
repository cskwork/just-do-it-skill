// Constant-time API-key check. Fail-closed when no keys are configured.
import { timingSafeEqual } from "node:crypto";

/**
 * @param {{keys?: string[]}} opts
 */
export function createAuth({ keys = [] } = {}) {
  const configured = keys.filter((k) => typeof k === "string" && k.length > 0);
  const encoded = configured.map((k) => Buffer.from(k, "utf8"));

  /**
   * @param {unknown} presentedKey
   * @returns {boolean}
   */
  function check(presentedKey) {
    if (typeof presentedKey !== "string" || presentedKey.length === 0) return false;
    if (encoded.length === 0) return false; // no keys => deny (fail closed)

    const candidate = Buffer.from(presentedKey, "utf8");
    // Compare against every key; do not short-circuit on the first match so the
    // timing profile stays uniform regardless of which key (if any) matched.
    let matched = false;
    for (const key of encoded) {
      if (key.length === candidate.length && timingSafeEqual(key, candidate)) {
        matched = true;
      }
    }
    return matched;
  }

  return { check };
}
