import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/store.js";

async function freshStore() {
  const dir = await mkdtemp(join(tmpdir(), "shortener-store-"));
  const dataFile = join(dir, "links.json");
  const store = createStore({ dataFile });
  await store.init();
  return { dir, dataFile, store, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test("create/get/hit/stats round-trip", async () => {
  const { dir, store, cleanup } = await freshStore();
  try {
    const rec = await store.create("https://example.com/");
    assert.ok(rec.code && rec.code.length >= 7);
    assert.equal(rec.url, "https://example.com/");
    assert.equal(rec.hits, 0);
    assert.ok(rec.createdAt);

    assert.deepEqual(store.get(rec.code), rec);
    const hit = await store.incrementHit(rec.code);
    assert.equal(hit.hits, 1);
    assert.equal(store.stats(rec.code).hits, 1);

    assert.equal(store.get("nope"), null);
    assert.equal(await store.incrementHit("nope"), null);
  } finally {
    await cleanup();
  }
  assert.ok(dir);
});

test("no .tmp file remains after create", async () => {
  const { dir, store, cleanup } = await freshStore();
  try {
    await store.create("https://example.com/");
    const files = await readdir(dir);
    assert.ok(!files.some((f) => f.includes(".tmp")), `temp left behind: ${files}`);
    assert.ok(files.includes("links.json"));
  } finally {
    await cleanup();
  }
});

test("50 concurrent creates: unique codes, all persisted, valid JSON", async () => {
  const { dir, dataFile, store, cleanup } = await freshStore();
  try {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => store.create(`https://example.com/${i}`)),
    );
    const codes = new Set(results.map((r) => r.code));
    assert.equal(codes.size, 50, "all codes unique in memory");

    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw); // throws if torn -> test fails
    assert.equal(Object.keys(parsed).length, 50, "all 50 persisted to disk");
    for (const r of results) {
      assert.equal(parsed[r.code].url, r.url);
    }

    const files = await readdir(dir);
    assert.ok(!files.some((f) => f.includes(".tmp")), "no temp files after concurrency");
  } finally {
    await cleanup();
  }
});

test("persistence survives reload from disk", async () => {
  const { dataFile, store, cleanup } = await freshStore();
  try {
    const rec = await store.create("https://reload.test/");
    await store.incrementHit(rec.code);

    const reloaded = createStore({ dataFile });
    await reloaded.init();
    const got = reloaded.get(rec.code);
    assert.equal(got.url, "https://reload.test/");
    assert.equal(got.hits, 1);
  } finally {
    await cleanup();
  }
});

test("throws if used before init", () => {
  const store = createStore({ dataFile: "/tmp/never-created/links.json" });
  assert.throws(() => store.get("x"), /init/);
});

test("create with expiresAt stores the value", async () => {
  const { store, cleanup } = await freshStore();
  try {
    const expires = new Date(Date.now() + 60000).toISOString();
    const rec = await store.create("https://example.com/ttl", expires);
    assert.equal(rec.expiresAt, expires);
    assert.equal(store.get(rec.code).expiresAt, expires);
  } finally {
    await cleanup();
  }
});

test("create without expiresAt stores null", async () => {
  const { store, cleanup } = await freshStore();
  try {
    const rec = await store.create("https://example.com/no-ttl");
    assert.equal(rec.expiresAt, null);
  } finally {
    await cleanup();
  }
});

test("legacy records without expiresAt field load and behave as never-expire", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shortener-store-legacy-"));
  const dataFile = join(dir, "links.json");
  try {
    // Write a legacy record without the expiresAt field.
    const legacyRecord = { code: "abc1234", url: "https://legacy.example.com/", hits: 5, createdAt: "2024-01-01T00:00:00.000Z" };
    await writeFile(dataFile, JSON.stringify({ abc1234: legacyRecord }), "utf8");

    const store = createStore({ dataFile });
    await store.init();
    const got = store.get("abc1234");
    assert.ok(got, "legacy record should be retrievable");
    assert.equal(got.url, "https://legacy.example.com/");
    // expiresAt is undefined (not set) — must not be treated as expired.
    // The expiry check in handleRedirect is: record.expiresAt && ...
    // undefined is falsy, so no expiry is triggered.
    assert.ok(!got.expiresAt, "legacy record has no expiresAt -> falsy -> never-expire");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
