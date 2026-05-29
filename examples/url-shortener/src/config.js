// Parse and normalize service configuration from an injectable env object.
// A factory (not a singleton) so tests can supply their own env.

const DEFAULT_BIN_PORT = 8080;

/**
 * Build an immutable config object from `env`.
 * @param {Record<string,string|undefined>} env  process.env or a test stub
 * @param {{ defaultPort?: number }} [opts]  bin uses 8080; tests omit -> 0 (ephemeral)
 */
export function createConfig(env = {}, opts = {}) {
  const fallbackPort = opts.defaultPort ?? 0;
  const port = parsePort(env.PORT, fallbackPort);
  const baseUrl = (env.BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, "");

  return Object.freeze({
    port,
    baseUrl,
    apiKeys: parseCsv(env.API_KEYS),
    dataFile: env.DATA_FILE ?? "./data/links.json",
    rlCapacity: parsePositiveInt(env.RL_CAPACITY, 20),
    rlRefillPerSec: parsePositiveNumber(env.RL_REFILL_PER_SEC, 5),
    defaultTtlSeconds: parsePositiveInt(env.DEFAULT_TTL_SECONDS, 0),
  });
}

export const binDefaultPort = DEFAULT_BIN_PORT;

function parsePort(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) return fallback;
  return n;
}

function parseCsv(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parsePositiveNumber(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
