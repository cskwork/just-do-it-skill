# Fix plan (APPROVED) — hit-count lost-update race

## Root cause
`src/store.js` `incrementHit`: the `links.get(code)` read was hoisted OUT of the `enqueue()` mutex.
The mutex serialized only the write, not the read-modify-write as a unit. Under concurrency, many
calls read the same stale `hits` before any write commits, then all write `stale+1` → lost updates.
Single-threaded and low-traffic paths are unaffected, which is why the full suite stayed green.

## Fix (applied)
Move the read back INSIDE the `enqueue()` task so read-modify-write is one atomic critical section
(restores the pre-regression behavior). No interface change.

## Regression guard (permanent)
`test/hit-concurrency.test.js`: fire 200 concurrent `incrementHit` on one code; assert hits === 200.
Failed at 1/200 before the fix; closes the CI gap that let the race ship.

## Acceptance (Verify gate)
- The previously-failing repro now passes in a clean sandbox.
- Full suite green.
- Concurrency result is stable across repeated runs (not flaky).
- No regression in any other test.
