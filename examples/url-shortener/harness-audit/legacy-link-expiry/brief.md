# Brief — LEGACY feature: optional link expiry (TTL)

## Feature
Add optional time-to-live to short links in the existing service.

- `POST /shorten` accepts an optional `ttlSeconds` (positive integer, bounded, e.g. <= 1 year). The
  created record stores an absolute `expiresAt` (or null for no expiry).
- `GET /:code` on an **expired** link does NOT redirect and does NOT count a hit; it returns an
  error (status TBD in plan/approval: 410 Gone vs 404).
- `GET /api/stats/:code` includes `expiresAt` (and whether the link is currently expired).
- Optional config `DEFAULT_TTL_SECONDS` (default: none / never expire) applied when the request
  omits `ttlSeconds`.

## Backward compatibility (the LEGACY constraint)
Existing stored links (records persisted before this feature, with no `expiresAt`) MUST keep working
and be treated as never-expiring. No data migration required.

## Acceptance criteria (machine-checkable)
1. Full existing suite stays green (no regressions).
2. New tests: create with ttl sets expiresAt; expired link is not redirected and not counted;
   non-expired ttl link still redirects; stats includes expiresAt; a record with no expiresAt
   (old format) never expires; invalid ttlSeconds -> 400.
3. Change is surgical: matches existing module boundaries/style; no unrelated refactors.
