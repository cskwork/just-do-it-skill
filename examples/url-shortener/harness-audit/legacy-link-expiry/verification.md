# Verification — LEGACY link-expiry (TTL)

Adversarial, evidence-based. Source not modified. Commands run by verifier from clean state.

## tests-reproduce
- Clean state: removed `data/` contents, no `*.tmp.*` files present before run.
- Command: `npm --prefix /tmp/jdi-live/url-shortener test` (node --test).
- Result: `# tests 68 / # pass 68 / # fail 0 / # cancelled 0 / # skipped 0`.
- Matches builder claim (68 pass). GREEN.

## regression
### hits-still-count (MOST IMPORTANT — handleRedirect reorder)
handleRedirect was changed from incrementHit-first to `get()` -> expiry-check -> `incrementHit()`.
A normal (non-expired) GET must still 302 AND count.
- Test evidence: `integration.test.js` "full flow" — 302, Location==target, stats hits==1 (in 68-pass run).
- Independent live probe (PORT 8094): fresh no-ttl link, before hits=0; two GETs; after hits=2.
  - `regression.hitcount.before: 0`
  - `regression.hitcount.after: 2`
- Verdict: hits still counted on valid redirect. NO REGRESSION.

### concurrency-guard (DEBUG fix still holds)
- Command: `node --test test/hit-concurrency.test.js`.
- Result: `[repro] expected hits=200 actual hits=200 lost=0` -> `ok 1` (1 test, 1 pass, 0 fail).
- Verdict: 200 concurrent incrementHit == 200. Lost-update guard intact.

### unknown-404 (not 410)
- Live probe: GET `/this-code-never-existed` -> status 404, error.code `not_found`.
  - `regression.unknownCode.status: 404`
  - `regression.unknownCode.errorCode: not_found`
- Expired path returns 410 only when a record exists AND is past expiresAt (`get()` precedes expiry check). NO REGRESSION.

### auth / SSRF / ratelimit
- Covered green within the 68-pass suite: 401 (missing/bad key), 400 invalid_url, 400 SSRF (169.254.169.254), 429 + Retry-After. All pass.

## feature (independent live probes, PORT=8094 API_KEYS=testkey)
TTL=1 expiry flow:
- create ttlSeconds:1 -> `201`
- immediate GET -> `302`
- stats before expiry: hits=`1`, expired=`false`, expiresAt set=`true`
- wait ~1200ms; GET -> `410`, error.code=`link_expired`
- stats after expiry: hits=`1` (UNCHANGED — expired access not counted), expired=`true`, expiresAt set=`true`

No-TTL link:
- GET -> `302`; stats expiresAt=`null`, expired=`false`.

Invalid ttl -> 400 invalid_ttl each:
- ttlSeconds 0 -> `400` invalid_ttl
- ttlSeconds "x" -> `400` invalid_ttl
- ttlSeconds 1.5 -> `400` invalid_ttl

Server started via real entry `bin/shortener.js`; stopped cleanly after probes (TaskStop). Probes lived in `.verify-probe/` (outside `test/`, never picked up by `node --test`) and were moved aside afterward (rm sandbox-blocked); no tracked-file pollution.

## backward-compat
A record persisted WITHOUT an `expiresAt` field must be treated as never-expire.
- Existing test: `store.test.js` "legacy records without expiresAt ... behave as never-expire" — passes in suite; asserts `!got.expiresAt`.
- Independent throwaway probe: hand-wrote JSON `{legacy7:{code,url,hits:9,createdAt}}` (no expiresAt), `createStore` + `init()`, then `get()`:
  - `legacy.get.returned: true`
  - `legacy.url.preserved: true`
  - `legacy.hits.preserved: true`
  - `legacy.expiresAt.value: undefined`
  - `legacy.consideredExpired: false` (using the exact `!!expiresAt && Date.now()>Date.parse(...)` predicate)
- Verdict: legacy record loads intact and never expires. CONFIRMED.

## surgical-diff
`git diff --stat HEAD`:
```
 src/config.js            |   1 +
 src/server.js            |  18 ++++++--
 src/store.js             |   4 +-
 src/validate.js          |  17 +++++++-
 test/integration.test.js | 109 +++++++++++++++++++++++++++++++++++++++++++++++
 test/store.test.js       |  46 +++++++++++++++++++-
 test/validate.test.js    |  44 ++++++++++++++++++-
 7 files changed, 231 insertions(+), 8 deletions(-)
```
- Exactly the planned files (`src/validate.js`, `src/config.js`, `src/store.js`, `src/server.js`, + tests). No unrelated files touched.
- Source diff inspected: pure additions (validateTtl, defaultTtlSeconds config line, create(url, expiresAt=null), redirect expiry-check-before-increment, stats expiresAt/expired). One comment header updated on validate.js. NO reformatting/churn of unrelated code.
- `git status --porcelain` after probe cleanup: only the 7 M files; no stray untracked artifacts.

verdict: GREEN
