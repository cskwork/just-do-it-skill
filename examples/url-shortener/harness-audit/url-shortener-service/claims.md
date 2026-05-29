## CLAIM url-shortener-v1
what: production URL shortener (auth, rate limit, SSRF-safe validate, atomic store, redirect, stats, health)
files: package.json, bin/shortener.js, src/config.js, src/codec.js, src/validate.js, src/store.js, src/ratelimit.js, src/auth.js, src/logger.js, src/server.js, test/codec.test.js, test/validate.test.js, test/store.test.js, test/ratelimit.test.js, test/auth.test.js, test/integration.test.js, README.md
run-to-prove: cd /tmp/jdi-live/url-shortener && npm test
expected: node --test reports all tests passing, 0 failing

## CLAIM url-shortener-v2 (SSRF fix)
what: closed 2 SSRF bypasses ([::ffff:127.0.0.1] ipv6-mapped loopback, localhost. trailing dot) + added IPv6/FQDN-dot handling and regression tests
files: src/validate.js, test/validate.test.js
run-to-prove: cd /tmp/jdi-live/url-shortener && npm test
expected: node --test reports all tests passing, 0 failing, including the new SSRF rejection cases

## CLAIM url-shortener-v3 (malformed-path hardening)
what: malformed percent-encoding on /:code and /api/stats/:code now returns 400 invalid_code instead of 500 (unauth 5xx-inflation fixed)
files: src/server.js, test/integration.test.js
run-to-prove: cd /tmp/jdi-live/url-shortener && npm test
expected: node --test all passing, 0 failing, including the new malformed-path 400 cases
