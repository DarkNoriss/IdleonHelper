# Backend audit (main + native backend) — inconsistencies & safety

Date: 2026-03-19

Scope:

- Electron main process: `src/main/**`
- Preload-to-main IPC surface: `src/main/handlers.ts` (as called from `src/preload/index.ts`)
- Native backend service: `backend/**` (C# websocket server) + its bridge: `src/main/backend/**`

## Executive summary

The backend is structurally sound (clear separation: renderer → preload → IPC → scripts → websocket bridge → C# automation service), but there are a few **high-impact safety/correctness issues** around:

- WebSocket lifecycle cleanup (a real bug: connection may not actually close).
- Lack of explicit hardening for `BrowserWindow.webPreferences`.
- Boundary validation gaps (IPC payload validation, websocket auth/binding).
- Path traversal risk when resolving image assets.
- WebSocket server message framing/size handling (4KB buffer + no `EndOfMessage` handling).

## Architecture map (how it works)

- **Renderer calls** `window.api.*` (preload) which triggers Electron IPC.
- **IPC handlers** in `src/main/handlers.ts` call `scripts.*` and backend bridge helpers.
- **Backend bridge** in `src/main/backend/backend-client.ts` connects to the C# service over `ws://localhost:5000/ws`.
- **C# service** (`backend/Program.cs`) hosts a WebSocket endpoint and dispatches commands like `find`, `click`, `drag`, etc.

## Findings (prioritized)

### P0 — correctness & safety

#### 1) `closeConnection()` clears `ws` before closing it (WebSocket likely stays open)

**Where**

- `src/main/backend/backend-client.ts`:

```ts
export const closeConnection = (): void => {
  logger.log("Closing WebSocket connection")
  cleanup()
  ws?.close()
}
```

**What / why it matters**

`cleanup()` sets `ws = null` before `ws?.close()` runs. That makes the close call a no-op, which can leave a live connection and in-flight handlers around (especially problematic during shutdown / update install).

**Recommendation**

- Close the socket before clearing it, e.g. store a local reference: `const socket = ws; cleanup(); socket?.close();`.

#### 2) `BrowserWindow` security options are not explicitly hardened

**Where**

- `src/main/index.ts` `BrowserWindow({ webPreferences: { preload, sandbox: false, devTools: true } })`

**What / why it matters**

Electron defaults are generally safer than older versions, but relying on defaults is brittle. The backend exposes powerful automation primitives via IPC; you want defense-in-depth so a renderer compromise can’t escalate easily.

**Recommendation**

Explicitly set:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` (if compatible; otherwise document why not)
- `devTools: is.dev` (disable in production unless needed)
- Consider `webSecurity: true` and a strict CSP (mostly for renderer hardening, but impacts the whole app).

### P0 — security boundary

#### 3) Native backend websocket endpoint has no authentication and binding is implicit

**Where**

- C# server in `backend/Program.cs`
- Node bridge uses `ws://localhost:5000/ws` in `src/main/backend/backend-client.ts`

**What / why it matters**

- There is **no auth** on the `/ws` endpoint, and the commands include **input automation** (click/drag) + **screen capture** and **file reads** (loading template images).
- The server binding is implicit. Depending on runtime/environment, Kestrel might listen beyond loopback. Even if it is loopback today, it’s safer to **force** `127.0.0.1` only.

**Recommendation**

- Force binding to loopback only (e.g. `app.Urls.Add("http://127.0.0.1:5000")` / `UseUrls`, or equivalent Kestrel config).
- Add a simple auth token shared from the Electron main process (random per launch), required in the first message or as a query/header.

### P1 — input validation & robustness

#### 4) IPC handlers accept payloads without validation

**Where**

- `src/main/handlers.ts` accepts `steps: number[]`, `inventory: ParsedConstructionData`, `weights: SolverWeights`, etc.

**What / why it matters**

Renderer → IPC is a trust boundary. Even with context isolation, you should validate:

- Types (arrays contain numbers, objects have expected keys).
- Size/limits (e.g. `steps.length`, solve time bounds).
- Range checks (e.g. non-negative durations).

**Recommendation**

- Validate IPC inputs in `handlers.ts` before calling scripts.
- Prefer schema validation (Zod) or at minimum manual guards.

#### 5) Image asset path resolution can be escaped via `..` segments (path traversal)

**Where**

- `src/main/backend/backend-command.ts` `resolveImagePath()`

**What / why it matters**

`join(basePath, userSupplied)` will normalize `..` segments. If any higher layer can influence `imagePath`, it can potentially resolve outside `resources/assets` and make the C# backend attempt to read arbitrary local files (it checks `File.Exists` then reads). Even if today only internal scripts call it, this is a sharp edge.

**Recommendation**

- Resolve and then enforce: `const resolved = path.resolve(basePath, relative); if (!resolved.startsWith(basePathResolved + path.sep)) throw`.
- Consider only allowing a fixed allowlist of asset keys instead of raw paths.

### P1 — websocket framing & concurrency

#### 6) C# WebSocket receive loop assumes messages fit in 4KB and doesn’t handle fragmentation

**Where**

- `backend/Program.cs`: `buffer = new byte[1024 * 4]` and uses `result.Count` but doesn’t check `result.EndOfMessage`.

**What / why it matters**

WebSocket messages can be fragmented and can exceed 4KB. Current behavior risks:

- Truncated JSON → parse errors or partial commands.
- Silent failures (current code catches/ignores exceptions in multiple places).

**Recommendation**

- Accumulate frames until `EndOfMessage` is true (or use a higher-level message reader).
- Enforce a maximum message size (reject too-large payloads explicitly).

#### 7) Server swallows exceptions in `Task.Run` and the outer loop

**Where**

- `backend/Program.cs`: `catch { }` blocks both in the spawned task and the outer try/catch.

**What / why it matters**

Failures become invisible; the client sees timeouts instead of actionable errors. This complicates diagnosing production issues and can mask security-relevant faults.

**Recommendation**

- Log exceptions (at least to console) and send an error response when possible.

### P2 — consistency / correctness

#### 8) Single global status callback for backend connection status

**Where**

- `src/main/backend/backend-client.ts`: `statusChangeCallback` is a single slot.

**Impact**

If multiple consumers want status updates, they overwrite each other. (Renderer currently subscribes via preload, so this may be “fine” today, but it’s inconsistent with event-subscription semantics elsewhere.)

**Recommendation**

- Use a small pub/sub pattern (set of callbacks) and return an unsubscribe.

#### 9) `sendCommand()` sends commands without `ws.send` error handling

**Where**

- `src/main/backend/backend-client.ts` `ws!.send(messageJson)` inside a Promise.

**Impact**

If `send` fails synchronously or via callback (depending on library), the promise may not reject cleanly and will time out instead.

**Recommendation**

- Use the `ws.send(data, cb)` callback to reject on error.

## Notes on strengths (things you did right)

- **Cancellation exists in both layers**: JS `cancellationManager` and C# `OperationCancellationManager` support stopping operations.
- **Backpressure on sending**: C# `MessageHandler` uses a send semaphore to serialize websocket sends.
- **Clear separation of responsibilities**: scripts don’t directly touch WebSocket details; bridge module does.

## Suggested next steps

1) Fix `closeConnection()` ordering bug (P0).
2) Harden `BrowserWindow.webPreferences` explicitly and gate `devTools` by env (P0).
3) Force backend websocket to loopback + add per-launch auth token (P0).
4) Add IPC input validation (P1).
5) Fix C# websocket framing (P1).
6) Lock down image path resolution (P1).

