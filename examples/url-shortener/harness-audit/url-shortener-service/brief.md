# Brief — URL shortener service

## Goal
A production-grade, self-hostable HTTP URL shortener with API-key auth, abuse protection, and stats.

## Audience
Teams that want a private/self-hosted short-link service (no third-party tracking) embedded in their
own tooling — internal redirects, campaign links, docs.

## Acceptance criteria (machine-checkable)
1. `npm test` exits 0 with unit + integration tests covering every endpoint and every error path below.
2. Endpoints behave exactly as the contract in `plan.md` (status codes, headers, error envelope).
3. Security: API keys never hardcoded (read from env), compared in constant time; target-URL
   validation rejects non-http(s) and SSRF-class hosts; redirect uses the stored URL only (no
   open-redirect via user-supplied `Location`).
4. Concurrency: persistence is atomic (no torn writes) and serialized; concurrent creates never
   corrupt the store or collide on codes.
5. Operability: `GET /health` liveness; structured JSON logs with a request id; graceful shutdown on
   SIGTERM.

## Non-goals
- No web UI, no user accounts, no database server (file-backed store is acceptable for the MVP).
- No custom vanity codes, no link expiry (explicit future work).
- No clustering/HA (single-process MVP).
