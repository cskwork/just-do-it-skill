// Repro for production "hit undercount under concurrency" incident.
// Drives the REAL store: fires N concurrent incrementHit() calls against the
// SAME code, then asserts recorded hits === N. Expected to FAIL (records < N)
// while the lost-update race in store.incrementHit exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/store.js";

async function freshStore() {
  const dir = await mkdtemp(join(tmpdir(), "shortener-hitrace-"));
  const dataFile = join(dir, "links.json");
  const store = createStore({ dataFile });
  await store.init();
  return { store, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test("200 concurrent incrementHit on the same code => hits === 200", async () => {
  const N = 200;
  const { store, cleanup } = await freshStore();
  try {
    const rec = await store.create("https://example.com/popular");
    assert.equal(rec.hits, 0);

    // Fire all increments "at once": each captures its own snapshot of the
    // record before any of them commits, which is exactly the redirect hot path
    // under load. No awaits between dispatches.
    await Promise.all(
      Array.from({ length: N }, () => store.incrementHit(rec.code)),
    );

    const final = store.stats(rec.code).hits;
    // Record the observed count regardless of pass/fail.
    console.log(`[repro] expected hits=${N} actual hits=${final} lost=${N - final}`);
    assert.equal(final, N, `lost-update race: recorded ${final} of ${N} hits`);
  } finally {
    await cleanup();
  }
});
