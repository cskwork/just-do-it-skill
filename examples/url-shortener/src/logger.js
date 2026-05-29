// Minimal structured JSON logger. One line per event to stderr.

const LEVELS = new Set(["debug", "info", "warn", "error"]);

/**
 * @param {{base?: Record<string, unknown>, sink?: (line:string)=>void}} [opts]
 */
export function createLogger({ base = {}, sink = defaultSink } = {}) {
  function log(level, msg, fields = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level: LEVELS.has(level) ? level : "info",
      msg,
      ...base,
      ...fields,
    };
    sink(JSON.stringify(entry));
  }

  // Request-scoped child logger that always carries `fields` (e.g. requestId).
  function child(fields = {}) {
    return createLogger({ base: { ...base, ...fields }, sink });
  }

  return { log, child };
}

function defaultSink(line) {
  process.stderr.write(line + "\n");
}
