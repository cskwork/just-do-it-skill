# QA — black-box exercise of the running app

The QA phase (GREENFIELD/LEGACY, and any web-bug check in DEBUG) drives the real app as a user would
and records **user-observable** evidence in the vault. Path depends on app type.

## Always: run the browser inside a subagent

Dispatch the `qa-tester` subagent to drive the app. Raw page dumps, screenshots, and console logs
stay in **its** context; it returns only a compressed summary + the evidence file paths. Never run
agent-browser from the orchestrator — that floods the conductor's context.

## Web / browser app

1. **Serve.** If the app has a server, start it on localhost in the background (`run_in_background`),
   poll the port/health URL until ready, record the URL. Serve from the Verify `git worktree` (the
   committed build state), not a dirty tree, so QA exercises exactly what ships. Tear it down at end.
2. **Tool — agent-browser** (https://github.com/vercel-labs/agent-browser): fast browser-automation
   CLI for agents. If `agent-browser` is not on PATH → `npm i -g agent-browser` (auto-install); if the
   install is blocked, STOP and prompt the user to install it. The subagent first runs
   `agent-browser skills get core --full` (version-matched command reference), then drives the app:
   `open`, `snapshot` (a11y tree with refs), `click`/`type`/`fill`, `screenshot`.
3. **Exit gate.** Golden path + edge cases + a11y (`snapshot`) all pass. UI/UX jobs also run the
   taste Pre-Flight Check (`reference/ui-ux.md`).
4. **As-is → to-be (the user-observable proof).** Capture the change at the same route/viewport:
   `qa/as-is-<view>.png` before, `qa/to-be-<view>.png` after. For a DEBUG web bug, as-is = the
   reproduced failure, to-be = the fixed behavior. Identical framing = an honest diff.

## CLI / library (no browser)

Integration smoke only: real invocation against a fixture, diff stdout vs a known-good snapshot.

## Record in the vault (QA docs)

Put evidence under `<vault>/qa/` and summarize in `verification.md` `## QA`:
- commands run + pass/fail per check,
- the `as-is`/`to-be` screenshot paths (browsable in the committed changelog),
- served URL + teardown note.
The vault is committed, so this QA record is the proof the user can open and compare.

## Repeated QA → make it a repeatable script

The first QA pass may be hand-driven. If the same flow runs again (a Verify/QA rewind re-opens Build,
or the user asks to re-check), STOP hand-driving and propose a **Playwright CLI** script: convert the
agent-browser steps into `qa/<flow>.spec.ts` in the vault, run that on every re-check, and note its
path in `## QA`. One script makes the as-is/to-be diff reproducible instead of re-typed.
