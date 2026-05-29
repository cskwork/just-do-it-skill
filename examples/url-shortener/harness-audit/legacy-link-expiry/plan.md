# Plan (FROZEN pending approval) — link expiry (TTL)

Surgical, backward-compatible. No DB/migration. Reuses existing modules and style.

## Changes
1. `src/validate.js` — add `validateTtl(raw)`: `undefined` -> `{ok,ttlSeconds:null}`; else must be an
   integer in `[1, 31536000]` (<=1 year) -> `{ok,ttlSeconds}`; otherwise `{ok:false,reason}`. Mirrors
   `validateTargetUrl`'s return shape.
2. `src/config.js` — add `defaultTtlSeconds: parsePositiveInt(env.DEFAULT_TTL_SECONDS, 0)` (0 = none).
3. `src/store.js` — `create(url, expiresAt = null)`; include `expiresAt` in the frozen record literal.
   Load/persist unchanged (old records keep `expiresAt === undefined`, handled as never-expire).
4. `src/server.js`
   - `handleShorten`: after URL validation, `validateTtl(body?.ttlSeconds)` -> 400 `invalid_ttl` on
     failure. Effective ttl = request value, else `config.defaultTtlSeconds`. If effective > 0,
     `expiresAt = new Date(Date.now()+ttl*1000).toISOString()`, else `null`. Pass to `store.create`.
   - `handleRedirect`: **expiry check BEFORE counting a hit** — `record = store.get(code)`; if none ->
     404; if `record.expiresAt && Date.now() > Date.parse(record.expiresAt)` -> **410 `link_expired`**
     (no hit counted); else `incrementHit` + 302.
   - `handleStats`: add `expiresAt: record.expiresAt ?? null` and
     `expired: !!record.expiresAt && Date.now() > Date.parse(record.expiresAt)`.

## Decisions (baked in unless approval changes them)
- Expired redirect status: **410 Gone** (`link_expired`) — distinguishes "expired" from "never existed".
- **Lazy** expiry (checked on read); no background sweep (no scheduler dependency).
- Expired links **do not count hits** (check before increment) and are **never redirected**.
- Max TTL 1 year; `ttlSeconds:0`/omitted + no default -> never expires.

## Acceptance (Verify/QA)
- Full existing suite stays green (no regressions).
- New: create-with-ttl sets expiresAt; expired link -> 410 + hits unchanged; non-expired ttl ->
  302; stats includes expiresAt/expired; **old record (no expiresAt) never expires**; bad ttl -> 400.
- No unrelated refactor / formatting churn.
