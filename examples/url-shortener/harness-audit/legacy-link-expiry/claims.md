## CLAIM link-expiry-v1
what: optional TTL (ttlSeconds + DEFAULT_TTL_SECONDS) with expiresAt on records; expired links -> 410, not redirected, not counted; backward-compatible with records lacking expiresAt
files:
  - src/validate.js   (added and exported validateTtl)
  - src/config.js     (added defaultTtlSeconds via parsePositiveInt)
  - src/store.js      (create now accepts expiresAt=null, stored in record literal)
  - src/server.js     (handleShorten validates ttl + computes expiresAt; handleRedirect checks expiry before incrementHit; handleStats emits expiresAt+expired)
  - test/validate.test.js   (9 new validateTtl tests)
  - test/store.test.js      (3 new tests: expiresAt stored, null default, legacy backward-compat)
  - test/integration.test.js (4 new TTL scenario tests)
run-to-prove: cd /tmp/jdi-live/url-shortener && npm test
expected: node --test all passing, 0 failing, including new ttl + backward-compat cases
