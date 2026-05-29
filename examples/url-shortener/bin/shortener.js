#!/usr/bin/env node
// Entry point: wire config + dependencies, start the server, handle graceful shutdown.
import { binDefaultPort, createConfig } from "../src/config.js";
import { createStore } from "../src/store.js";
import { createRateLimiter } from "../src/ratelimit.js";
import { createAuth } from "../src/auth.js";
import { createLogger } from "../src/logger.js";
import { createServer } from "../src/server.js";

async function main() {
  const config = createConfig(process.env, { defaultPort: binDefaultPort });
  const logger = createLogger();

  const store = createStore({ dataFile: config.dataFile });
  await store.init();

  const auth = createAuth({ keys: config.apiKeys });
  const rateLimiter = createRateLimiter({
    capacity: config.rlCapacity,
    refillPerSec: config.rlRefillPerSec,
  });

  const { server, close } = createServer({ store, auth, rateLimiter, config, logger });

  await new Promise((resolve) => server.listen(config.port, resolve));
  const addr = server.address();
  logger.log("info", "server.listening", { port: addr?.port, baseUrl: config.baseUrl });

  const shutdown = async (signal) => {
    logger.log("info", "server.shutdown", { signal });
    await close();
    logger.log("info", "server.closed", {});
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ level: "error", msg: "fatal", err: String(err?.stack ?? err) }) + "\n");
  process.exit(1);
});
