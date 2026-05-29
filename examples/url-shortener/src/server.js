// HTTP layer: routing, auth -> rate-limit -> business order, error envelope.
import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { validateTargetUrl, validateTtl } from "./validate.js";

const MAX_BODY_BYTES = 64 * 1024; // generous cap; bodies are small JSON

/**
 * @param {{store, auth, rateLimiter, config, logger}} deps
 * @returns {{server: import('node:http').Server, close: ()=>Promise<void>}}
 */
export function createServer({ store, auth, rateLimiter, config, logger }) {
  const server = createHttpServer((req, res) => {
    const requestId = randomUUID();
    const reqLog = logger.child({ requestId });
    reqLog.log("info", "request.start", { method: req.method, path: req.url });
    handle(req, res, { store, auth, rateLimiter, config, log: reqLog })
      .catch((err) => sendError(res, 500, "internal_error", "internal server error", reqLog, err))
      .finally(() => reqLog.log("info", "request.finish", { status: res.statusCode }));
  });

  function close() {
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return { server, close };
}

async function handle(req, res, ctx) {
  const url = new URL(req.url, "http://internal");
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/health") return sendJson(res, 200, { status: "ok" });
  if (method === "POST" && path === "/shorten") return handleShorten(req, res, ctx);

  const statsCode = matchStats(method, path);
  if (statsCode !== null) return handleStats(req, res, statsCode, ctx);

  const redirectCode = matchRedirect(method, path);
  if (redirectCode === DECODE_FAILED) {
    return sendError(res, 400, "invalid_code", "short code is not valid", ctx.log);
  }
  if (redirectCode !== null) return handleRedirect(res, redirectCode, ctx);

  return sendError(res, 404, "not_found", "resource not found", ctx.log);
}

// Sentinel: route shape matched but the path segment had malformed percent-
// encoding. Distinct from null (no match -> 404) so handle() can return 400.
const DECODE_FAILED = Symbol("decode_failed");

function decodeSegment(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return DECODE_FAILED;
  }
}

async function handleShorten(req, res, ctx) {
  if (!ctx.auth.check(req.headers["x-api-key"])) {
    return sendError(res, 401, "unauthorized", "missing or invalid API key", ctx.log);
  }
  const verdict = ctx.rateLimiter.allow(req.headers["x-api-key"]);
  if (!verdict.ok) {
    res.setHeader("Retry-After", String(verdict.retryAfter));
    return sendError(res, 429, "rate_limited", "rate limit exceeded", ctx.log);
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const code = err.code === "body_too_large" ? "payload_too_large" : "malformed_json";
    const status = err.code === "body_too_large" ? 413 : 400;
    return sendError(res, status, code, err.message, ctx.log);
  }

  const result = validateTargetUrl(body?.url);
  if (!result.ok) return sendError(res, 400, "invalid_url", result.reason, ctx.log);

  const ttlResult = validateTtl(body?.ttlSeconds);
  if (!ttlResult.ok) return sendError(res, 400, "invalid_ttl", ttlResult.reason, ctx.log);

  const effectiveTtl = ttlResult.ttlSeconds ?? ctx.config.defaultTtlSeconds;
  const expiresAt = effectiveTtl > 0 ? new Date(Date.now() + effectiveTtl * 1000).toISOString() : null;

  const record = await ctx.store.create(result.url, expiresAt);
  return sendJson(res, 201, { code: record.code, shortUrl: `${ctx.config.baseUrl}/${record.code}` });
}

async function handleRedirect(res, code, ctx) {
  const record = ctx.store.get(code);
  if (!record) return sendError(res, 404, "not_found", "unknown short code", ctx.log);
  if (record.expiresAt && Date.now() > Date.parse(record.expiresAt)) {
    return sendError(res, 410, "link_expired", "this link has expired", ctx.log);
  }
  await ctx.store.incrementHit(code);
  // Location is ALWAYS the stored, pre-validated URL — never user input.
  res.statusCode = 302;
  res.setHeader("Location", record.url);
  res.end();
}

function handleStats(req, res, code, ctx) {
  if (!ctx.auth.check(req.headers["x-api-key"])) {
    return sendError(res, 401, "unauthorized", "missing or invalid API key", ctx.log);
  }
  // Auth passed: a malformed code is a 400, never leaking whether it exists.
  if (code === DECODE_FAILED) {
    return sendError(res, 400, "invalid_code", "short code is not valid", ctx.log);
  }
  const record = ctx.store.stats(code);
  if (!record) return sendError(res, 404, "not_found", "unknown short code", ctx.log);
  return sendJson(res, 200, {
    code: record.code,
    url: record.url,
    hits: record.hits,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt ?? null,
    expired: !!record.expiresAt && Date.now() > Date.parse(record.expiresAt),
  });
}

// --- routing helpers ---

function matchStats(method, path) {
  if (method !== "GET") return null;
  const m = path.match(/^\/api\/stats\/([^/]+)$/);
  return m ? decodeSegment(m[1]) : null;
}

function matchRedirect(method, path) {
  if (method !== "GET") return null;
  const m = path.match(/^\/([^/]+)$/);
  if (!m) return null;
  const code = decodeSegment(m[1]);
  if (code === DECODE_FAILED) return DECODE_FAILED;
  return code === "health" || code === "shorten" ? null : code;
}

// --- io helpers ---

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(makeErr("body_too_large", "request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (raw === "") return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(makeErr("malformed_json", "request body is not valid JSON"));
      }
    });
    req.on("error", () => reject(makeErr("read_error", "failed to read request body")));
  });
}

function makeErr(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

function sendError(res, status, code, message, log, cause) {
  if (cause) log.log("error", "request.error", { code, status, err: String(cause?.stack ?? cause) });
  sendJson(res, status, { error: { code, message } });
}
