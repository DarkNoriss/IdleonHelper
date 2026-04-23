# Logging Conventions

This doc defines how scripts and main-process modules should use the logger. It is consumed by the script-audit spec.

## Levels

The logger exposes four methods: `logger.log`, `logger.info`, `logger.warn`, `logger.error`.

- **`logger.log`** — queue / orchestration / lifecycle. Used by `queue/engine.ts` and by top-level IPC handlers. Scripts should NOT call `log` directly.
- **`logger.info`** — script-domain progress. Use for normal, expected milestones inside a script: "nav: moved to trapping tab", "trap: found 3 placed traps at row 2".
- **`logger.warn`** — recoverable-but-unexpected. Use when a retry kicked in, a fallback path was taken, or a condition was tolerated but worth noting: "nav: target not found on first pass, retrying", "backend: slow response (2400ms)".
- **`logger.error`** — the script failed or will fail. Use for unrecoverable conditions the script is about to throw for, or that invalidate the run. Always include the underlying reason.

If unsure between `info` and `warn`: was this part of the happy path? -> `info`. Did something unusual happen that we managed? -> `warn`.

## Message shape

- Format: `"<area>: <what happened>"`, lowercase area, colon-space, concise human-readable message.
- Examples:
  - `nav: moved to trapping tab`
  - `trap: found 3 placed traps at row 2`
  - `backend click failed - target not found`
- ASCII only. No special characters, no emojis, no unicode dashes — per CLAUDE.md.
- No secrets, tokens, user paths, or absolute file paths. Log structured identifiers (run id, script id) — the logger attaches these automatically via run context.

## Where logs go

- In-memory buffer — always visible on the in-app logs page.
- If emitted during a script run (inside the `runContext` set by `queue/engine.ts`), the entry is also written to `userData/logs/runs/<itemId>.jsonl` by the transcript sink.
- Helpers like `navigateTo` inherit the run context automatically via `AsyncLocalStorage` — zero code changes required in the helper.

## Anti-patterns

- `logger.log("something")` inside a script — prefer `logger.info(...)`.
- Silent `catch {}` that swallows failure without any log — at minimum `logger.error("<area>: <reason>")`.
- Wide `console.log` — the custom logger goes through `console` already; prefer `logger.*` so entries are captured.
- Logging tight loops without sampling — cap rate or log summaries instead.
