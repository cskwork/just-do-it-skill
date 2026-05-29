// File-backed link store. In-memory Map is the source of truth after init();
// the JSON file is a durable mirror written atomically (temp + rename).
// All writes serialize through a single promise-chain mutex.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { generateCode } from "./codec.js";

const MAX_COLLISION_RETRIES = 10;

/**
 * @param {{dataFile:string, codeLen?:number}} opts
 */
export function createStore({ dataFile, codeLen = 7 }) {
  /** @type {Map<string, {code:string,url:string,hits:number,createdAt:string}>} */
  const links = new Map();
  let initialized = false;
  // Mutex: every mutation appends to this chain, so writes never interleave.
  let writeChain = Promise.resolve();

  async function init() {
    await mkdir(dirname(dataFile), { recursive: true });
    try {
      const raw = await readFile(dataFile, "utf8");
      const parsed = JSON.parse(raw);
      for (const rec of Object.values(parsed)) links.set(rec.code, rec);
    } catch (err) {
      if (err.code !== "ENOENT") throw err; // missing file => start empty
    }
    initialized = true;
  }

  function ensureInit() {
    if (!initialized) throw new Error("store.init() must be called before use");
  }

  async function create(url, expiresAt = null) {
    ensureInit();
    return enqueue(async () => {
      const code = freshCode();
      const record = Object.freeze({ code, url, hits: 0, createdAt: new Date().toISOString(), expiresAt });
      links.set(code, record);
      await persist();
      return record;
    });
  }

  async function incrementHit(code) {
    ensureInit();
    return enqueue(async () => {
      // Read INSIDE the lock: read-modify-write must be one atomic critical section,
      // or concurrent hits read the same stale count and overwrite each other (lost update).
      const existing = links.get(code);
      if (!existing) return null;
      const updated = Object.freeze({ ...existing, hits: existing.hits + 1 });
      links.set(code, updated);
      await persist();
      return updated;
    });
  }

  function get(code) {
    ensureInit();
    return links.get(code) ?? null;
  }

  function stats(code) {
    ensureInit();
    return links.get(code) ?? null;
  }

  // --- internals ---

  function freshCode() {
    for (let i = 0; i < MAX_COLLISION_RETRIES; i++) {
      const code = generateCode(codeLen);
      if (!links.has(code)) return code; // never overwrite an existing code
    }
    throw new Error("failed to generate a unique code after retries");
  }

  function enqueue(task) {
    const run = writeChain.then(task, task);
    // Keep the chain alive even if a task rejects, but don't swallow caller errors.
    writeChain = run.then(noop, noop);
    return run;
  }

  async function persist() {
    const snapshot = Object.fromEntries(links);
    const tmp = `${dataFile}.tmp.${randomBytes(6).toString("hex")}`;
    await writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf8");
    await rename(tmp, dataFile); // atomic on the same filesystem
  }

  return { init, create, get, incrementHit, stats };
}

function noop() {}
