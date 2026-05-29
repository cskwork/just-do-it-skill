# Validation — demand & scope

## JTBD
When an internal team needs to share or embed short links, they want a private short-link service
they control, so they can avoid leaking click data to a third party and keep links alive on their
own domain.

## Demand evidence (directional — see limitation note)
- The category is proven at scale (Bitly, TinyURL, t.co) — demand for URL shortening is not in doubt.
- The *differentiated* demand is **self-hosting / privacy / control**: recurring asks in r/selfhosted
  and the popularity of self-hosted OSS shorteners (Shlink, Kutt, YOURLS) confirm a real niche that
  the hosted incumbents don't serve.
- Build-vs-adopt: mature OSS exists, so a real product would differentiate (simpler ops, API-first,
  zero-dep). For THIS run the "customer" is the explicit user request to produce production-grade
  code — demand is given.

## Riskiest assumption
That a file-backed store is adequate for the MVP's concurrency/durability needs. Mitigated by making
writes atomic + serialized and documenting the DB swap as future work.

## MVP scope
Shorten (auth) → redirect → stats (auth) → health, with auth + rate limiting + SSRF-safe validation.
Everything in "Non-goals" (brief) is deferred.

## Decision: GO
Rationale: explicit user request for a production-grade build; bounded, well-specified, verifiable.
Limitation: this is a build/verification exercise, not independent market sizing — no pricing or TAM
data was gathered (none was available in the research set).
