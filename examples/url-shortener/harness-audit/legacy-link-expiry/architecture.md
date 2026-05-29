# Code map — TTL feature (from Explore, read-only)

| Concern | Location | Note |
|---|---|---|
| Record shape & construction | `src/store.js:15`, `:41` | only place records are made; `Object.freeze({code,url,hits,createdAt})` |
| Persist / load | `src/store.js:21-31` (load), `:87-92` (persist) | JSON-agnostic. **Old records lack `expiresAt` -> `undefined` -> treat as never-expire. No migration.** |
| Read without mutation | `src/store.js:60-63` `get()` | already exists — use for expiry-check-before-increment |
| Redirect + hit | `src/server.js:87-94` `handleRedirect` | currently `incrementHit` then 302; expiry check must run BEFORE increment |
| Stats response | `src/server.js:96-112` `handleStats` | add `expiresAt` + `expired` to payload |
| Config parsing | `src/config.js:11-24` | add `defaultTtlSeconds` via existing `parsePositiveInt` (`:43`) |
| Body parse / validation | `src/server.js:61-84` (`handleShorten`), `src/validate.js:12-43` | reusable `validate.js` module exists — add `validateTtl` there |
| Tests | `test/store.test.js`, `test/integration.test.js` (`startServer` `:15-41`) | extend with existing helpers |

Surgical change set: `src/store.js` (create accepts expiresAt), `src/config.js` (+1), `src/validate.js` (+validateTtl), `src/server.js` (shorten validate ttl, redirect expiry check, stats fields), + tests. No DB, no migration, no unrelated refactors.
