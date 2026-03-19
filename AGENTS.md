# AI / agent notes

- **Architecture and IPC:** Read `docs/agent-architecture.md` first (frontend to main to WebSocket, all channels, backend commands).
- **Package manager:** Use `pnpm` only.
- **After code changes:** Run `pnpm lint` and fix issues before finishing.
- **Renderer API:** `window.api` is defined in `src/preload/index.ts` and typed in `src/preload/index.d.ts` — keep them aligned with `src/main/handlers.ts`.
