import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConfig } from "../src/config.js";
import { createStore } from "../src/store.js";
import { createRateLimiter } from "../src/ratelimit.js";
import { createAuth } from "../src/auth.js";
import { createLogger } from "../src/logger.js";
import { createServer } from "../src/server.js";

// Boot a real server on an ephemeral port with injected env. Returns base url +
// teardown so each test (or group) can run against an isolated rate-limit bucket.
async function startServer(envOverrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), "shortener-int-"));
  const env = {
    PORT: "0",
    API_KEYS: "testkey",
    DATA_FILE: join(dir, "links.json"),
    RL_CAPACITY: "1000", // generous so unrelated tests never trip the limiter
    RL_REFILL_PER_SEC: "1000",
    ...envOverrides,
  };
  const config = createConfig(env);
  const store = createStore({ dataFile: config.dataFile });
  await store.init();
  const auth = createAuth({ keys: config.apiKeys });
  const rateLimiter = createRateLimiter({ capacity: config.rlCapacity, refillPerSec: config.rlRefillPerSec });
  const logger = createLogger({ sink: () => {} }); // silence logs in tests
  const { server, close } = createServer({ store, auth, rateLimiter, config, logger });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    teardown: async () => {
      await close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

let ctx;

before(async () => {
  ctx = await startServer();
});

after(async () => {
  if (ctx) await ctx.teardown();
});

function req(path, opts = {}) {
  return reqOn(ctx.base, path, opts);
}

function reqOn(base, path, { method = "GET", headers = {}, body, redirect = "manual" } = {}) {
  return fetch(base + path, { method, headers, body, redirect });
}

test("GET /health -> 200 {status:ok}, no auth", async () => {
  const res = await req("/health");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("POST /shorten missing key -> 401 envelope", async () => {
  const res = await req("/shorten", { method: "POST", body: JSON.stringify({ url: "https://example.com/" }) });
  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.error.code, "unauthorized");
});

test("POST /shorten bad key -> 401", async () => {
  const res = await req("/shorten", {
    method: "POST",
    headers: { "X-API-Key": "nope" },
    body: JSON.stringify({ url: "https://example.com/" }),
  });
  assert.equal(res.status, 401);
});

test("POST /shorten valid key + bad url -> 400", async () => {
  const res = await req("/shorten", {
    method: "POST",
    headers: { "X-API-Key": "testkey" },
    body: JSON.stringify({ url: "ftp://example.com/" }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "invalid_url");
});

test("POST /shorten valid key + SSRF url -> 400", async () => {
  const res = await req("/shorten", {
    method: "POST",
    headers: { "X-API-Key": "testkey" },
    body: JSON.stringify({ url: "http://169.254.169.254/" }),
  });
  assert.equal(res.status, 400);
});

test("POST /shorten malformed json -> 400", async () => {
  const res = await req("/shorten", {
    method: "POST",
    headers: { "X-API-Key": "testkey" },
    body: "{not json",
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "malformed_json");
});

test("full flow: shorten -> redirect (Location == original) -> stats hits==1", async () => {
  const target = "https://example.com/page?x=1";
  const created = await req("/shorten", {
    method: "POST",
    headers: { "X-API-Key": "testkey" },
    body: JSON.stringify({ url: target }),
  });
  assert.equal(created.status, 201);
  const { code, shortUrl } = await created.json();
  assert.ok(code);
  assert.ok(shortUrl.endsWith("/" + code));

  const redirect = await req("/" + code);
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), target);

  const stats = await req("/api/stats/" + code, { headers: { "X-API-Key": "testkey" } });
  assert.equal(stats.status, 200);
  const s = await stats.json();
  assert.equal(s.code, code);
  assert.equal(s.url, target);
  assert.equal(s.hits, 1);
  assert.ok(s.createdAt);
});

test("GET unknown code -> 404", async () => {
  const res = await req("/doesnotexist");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "not_found");
});

test("GET stats missing key -> 401", async () => {
  const res = await req("/api/stats/whatever");
  assert.equal(res.status, 401);
});

test("GET /%ZZ malformed code -> 400 invalid_code, not 500, no auth", async () => {
  const res = await req("/%ZZ");
  assert.equal(res.status, 400);
  assert.notEqual(res.status, 500);
  assert.equal((await res.json()).error.code, "invalid_code");
});

test("GET /api/stats/%ZZ valid key + malformed code -> 400 invalid_code, not 500", async () => {
  const res = await req("/api/stats/%ZZ", { headers: { "X-API-Key": "testkey" } });
  assert.equal(res.status, 400);
  assert.notEqual(res.status, 500);
  assert.equal((await res.json()).error.code, "invalid_code");
});

test("unknown route -> 404 envelope", async () => {
  const res = await req("/api/unknown/thing", { method: "GET" });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "not_found");
});

test("exceeding rate limit -> 429 with Retry-After", async () => {
  // Dedicated server with a tiny capacity and near-zero refill so the bucket
  // drains deterministically and is isolated from the other tests' bucket.
  const rl = await startServer({ RL_CAPACITY: "2", RL_REFILL_PER_SEC: "0.001" });
  try {
    const headers = { "X-API-Key": "testkey" };
    const send = (i) =>
      reqOn(rl.base, "/shorten", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: "https://example.com/rl" + i }),
      });

    assert.equal((await send(0)).status, 201); // token 1
    assert.equal((await send(1)).status, 201); // token 2
    const limited = await send(2); // bucket empty
    assert.equal(limited.status, 429);
    const retryAfter = limited.headers.get("retry-after");
    assert.ok(retryAfter !== null, "429 must include Retry-After header");
    assert.ok(Number(retryAfter) > 0);
    assert.equal((await limited.json()).error.code, "rate_limited");
  } finally {
    await rl.teardown();
  }
});

// --- TTL / link-expiry tests ---

test("POST /shorten with ttlSeconds:1 -> 201; immediate GET -> 302; after expiry -> 410, hits unchanged", async () => {
  const ttl = await startServer();
  try {
    const headers = { "X-API-Key": "testkey" };

    const created = await reqOn(ttl.base, "/shorten", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://example.com/ttl-test", ttlSeconds: 1 }),
    });
    assert.equal(created.status, 201);
    const { code } = await created.json();

    // Immediate access -> 302 + hit counted.
    const r1 = await reqOn(ttl.base, "/" + code);
    assert.equal(r1.status, 302);

    // Confirm hit=1 before expiry.
    const s1 = await reqOn(ttl.base, "/api/stats/" + code, { headers });
    const stats1 = await s1.json();
    assert.equal(stats1.hits, 1);
    assert.ok(stats1.expiresAt, "stats should include expiresAt");
    assert.equal(stats1.expired, false);

    // Wait for expiry.
    await new Promise((r) => setTimeout(r, 1100));

    // Expired access -> 410, NOT a redirect, NOT incrementing hits.
    const r2 = await reqOn(ttl.base, "/" + code);
    assert.equal(r2.status, 410);
    assert.equal((await r2.json()).error.code, "link_expired");

    // Hits must still be 1 (expired access did not count).
    const s2 = await reqOn(ttl.base, "/api/stats/" + code, { headers });
    const stats2 = await s2.json();
    assert.equal(stats2.hits, 1, "expired access must not increment hits");
    assert.equal(stats2.expired, true);
  } finally {
    await ttl.teardown();
  }
});

test("POST /shorten with no ttl -> never expires, stats expiresAt null", async () => {
  const s = await startServer();
  try {
    const headers = { "X-API-Key": "testkey" };
    const created = await reqOn(s.base, "/shorten", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://example.com/no-ttl" }),
    });
    assert.equal(created.status, 201);
    const { code } = await created.json();

    const stats = await reqOn(s.base, "/api/stats/" + code, { headers });
    const body = await stats.json();
    assert.equal(body.expiresAt, null);
    assert.equal(body.expired, false);
  } finally {
    await s.teardown();
  }
});

test("POST /shorten with invalid ttlSeconds -> 400 invalid_ttl", async () => {
  const s = await startServer();
  try {
    const headers = { "X-API-Key": "testkey" };
    const send = (ttlSeconds) =>
      reqOn(s.base, "/shorten", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: "https://example.com/bad-ttl", ttlSeconds }),
      });

    for (const bad of [0, "x", 1.5]) {
      const res = await send(bad);
      assert.equal(res.status, 400, `expected 400 for ttlSeconds=${JSON.stringify(bad)}`);
      assert.equal((await res.json()).error.code, "invalid_ttl");
    }
  } finally {
    await s.teardown();
  }
});

test("stats response includes expiresAt and expired fields", async () => {
  const s = await startServer();
  try {
    const headers = { "X-API-Key": "testkey" };
    const created = await reqOn(s.base, "/shorten", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://example.com/stats-fields", ttlSeconds: 3600 }),
    });
    assert.equal(created.status, 201);
    const { code } = await created.json();

    const stats = await reqOn(s.base, "/api/stats/" + code, { headers });
    const body = await stats.json();
    assert.ok("expiresAt" in body, "stats must include expiresAt field");
    assert.ok("expired" in body, "stats must include expired field");
    assert.ok(typeof body.expiresAt === "string", "expiresAt should be an ISO string");
    assert.equal(body.expired, false);
  } finally {
    await s.teardown();
  }
});
