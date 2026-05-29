# Brief — DEBUG: hit-count undercount

## Symptom (as reported)
Production incident. `GET /api/stats/:code` undercounts hits on popular short links: stats report
fewer hits than the load balancer / access logs show. It only shows up on high-traffic links served
under many concurrent requests; low-traffic links are accurate. A single request is always counted.

## Expected vs actual
Expected: hits == number of successful redirects served for that code.
Actual: hits < number of redirects, under concurrency only; intermittent.

## Mode
DEBUG (deep-and-narrow). Single-driver. Open read-only; reproduce-first; human approval before any
source change.
