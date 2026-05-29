# url-shortener

Production-grade, self-hostable URL shortener HTTP service with API-key auth, abuse
protection (token-bucket rate limiting), SSRF-safe URL validation, atomic file-backed
storage, redirects, hit stats, health checks, structured logging, and graceful shutdown.

**Zero runtime dependencies** — only Node.js built-ins (`node:http`, `node:crypto`,
`node:fs/promises`, `node:test`). Requires Node.js >= 18 (ESM).

## Run

```bash
npm start                 # listens on :8080 by default
API_KEYS=key1,key2 npm start
```

Or via the bin:

```bash
node bin/shortener.js
```

Send `SIGTERM` (or `SIGINT`) for a graceful shutdown (open server is closed, then exit 0).

## Test

```bash
npm test                  # runs node --test, fully offline
```

## Configuration (env vars)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `8080` (bin) | TCP port; `0` picks an ephemeral port (tests). |
| `BASE_URL` | `http://localhost:PORT` | Prefix used to build `shortUrl`. |
| `API_KEYS` | _(empty)_ | Comma-separated keys. Empty => protected routes always 401 (fail closed). |
| `DATA_FILE` | `./data/links.json` | Durable JSON mirror of the link store. |
| `RL_CAPACITY` | `20` | Token-bucket capacity per API key. |
| `RL_REFILL_PER_SEC` | `5` | Tokens refilled per second per key. |

## Endpoints

| Method | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | none | `200 {"status":"ok"}` | — |
| POST | `/shorten` | `X-API-Key` | `201 {"code","shortUrl"}` | 400 invalid url / malformed json, 401 bad/missing key, 429 (+`Retry-After`) |
| GET | `/:code` | none | `302` `Location: <stored url>` (hits++) | 404 unknown code |
| GET | `/api/stats/:code` | `X-API-Key` | `200 {"code","url","hits","createdAt"}` | 401, 404 |
| _any other_ | — | — | — | 404 |

Order of checks for protected routes: **auth -> rate limit -> business logic**.

### Error envelope

All errors share one shape:

```json
{ "error": { "code": "<machine_code>", "message": "<human readable>" } }
```

### Example

```bash
curl -s -XPOST localhost:8080/shorten \
  -H 'X-API-Key: key1' -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
# {"code":"Ab3xY7z","shortUrl":"http://localhost:8080/Ab3xY7z"}

curl -si localhost:8080/Ab3xY7z        # 302 -> Location: https://example.com/page
curl -s  localhost:8080/api/stats/Ab3xY7z -H 'X-API-Key: key1'
# {"code":"Ab3xY7z","url":"https://example.com/page","hits":1,"createdAt":"..."}
```

## Security & correctness notes

- API keys are read from `API_KEYS` (never hardcoded) and compared in constant time
  via `crypto.timingSafeEqual` (length-safe; no throw on mismatch).
- URL validation rejects non-`http(s)` schemes, URLs over 2048 chars, and SSRF-class
  hosts: `localhost`, `0.0.0.0`, `::1`, and IPv4 ranges `127/8`, `10/8`, `172.16/12`,
  `192.168/16`, `169.254/16`.
- Redirect `Location` is always the stored, pre-validated URL — user input is never
  echoed into the redirect (no open-redirect).
- Store writes serialize through a single async mutex; persistence is atomic
  (temp file + `fs.rename`). Code generation is collision-resistant with retry.
- Each request gets a `requestId` (UUID) included in structured JSON logs to stderr.

## Known limitations & future work

Surfaced by an adversarial verification pass; all are LOW severity (the service issues a
`302` to a stored URL — it never server-side-fetches the target, so the SSRF blast radius
is a redirect, not a request from the server):

- **NAT64 `64:ff9b::/96`** embedded IPv4 is not decoded, so a NAT64-mapped private/loopback
  address is accepted. Harden by mapping the NAT64 prefix to its embedded v4 and range-checking.
- **`::ffff:0.0.0.0`** (IPv4-mapped wildcard) is accepted because `0.0.0.0/8` ("this host")
  is not in the blocked v4 ranges. Add `0.0.0.0/8` when hardening.
- **Unauthenticated request floods are not rate-limited** on `/shorten` (the limiter is
  per-API-key and runs after auth, by design). Add a coarse per-IP pre-auth limiter if exposed
  to the open internet.
- **File-backed store** is single-process; for HA/scale swap `src/store.js` for a database.
- No link expiry and no custom vanity codes (explicit MVP non-goals).
