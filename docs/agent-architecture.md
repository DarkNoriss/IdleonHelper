# Agent reference: Idleon Helper architecture

Use this doc when adding features, IPC, scripts, or UI pages. Keep it in sync when you add channels or commands.

## Stack overview

| Layer | Role |
|--------|------|
| **Renderer** (`src/renderer`) | React + Vite + Zustand. Uses `window.api` only (no direct WebSocket). |
| **Preload** (`src/preload/index.ts`) | Exposes `window.api` via `contextBridge`. **Single source of truth** for renderer-facing API shape. |
| **Main** (`src/main`) | Electron main: IPC handlers, starts .NET backend, owns WebSocket client to backend. |
| **Backend** (`backend/`, C#) | ASP.NET + WebSocket on `ws://localhost:5000/ws`. Image find/click/drag automation (Windows). |

## End-to-end flow

```
Renderer: window.api.*.method()
    -> ipcRenderer.invoke("channel", ...args)
    -> Main: ipcMain.handle("channel", ...) in handlers.ts
    -> scripts.* or other main logic
    -> backendCommand.* (main only) -> sendCommand() in backend-client.ts
    -> WebSocket JSON to C# MessageHandler
    -> response matched by message Id, camelCase-normalized in backend-client
```

**Rules for agents:**

- The **renderer never** calls `sendCommand` or opens a WebSocket; use IPC via `window.api`.
- New user-facing actions: add **preload** method, **ipcMain.handle**, implement in **scripts** (or appropriate main module), then use **backendCommand** only if you need find/click/drag/stop.
- Low-level automation from main always goes through **`backendCommand`** (`src/main/backend/backend-command.ts`), not ad-hoc WebSocket sends.

## WebSocket commands (.NET backend)

Endpoint: `ws://localhost:5000/ws` (port from `backend-client.ts`).

Outgoing message shape (JSON): PascalCase keys **`Id`**, **`Command`**, **`Data`** (see `sendCommand` in `backend-client.ts`). Command string values are **camelCase**:

| Command | Purpose | Request type (TS) | Notes |
|---------|---------|-------------------|--------|
| `find` | Template match, returns points | `FindRequest` | `imagePath` is resolved on main side to absolute path under `resources/assets`. |
| `findWithDebug` | Find + similarity + optional debug image | `FindWithDebugRequest` | |
| `click` | Mouse click at point | `ClickRequest` | |
| `drag` | Drag from start to end | `DragRequest` | |
| `dragRepeat` | Repeated drag for N seconds | `DragRepeatRequest` | |
| `stop` | Cancel in-flight backend work | `StopRequest` (empty) | Also invoked on script cancel from main. |

Type definitions: `src/main/backend/backend-types.ts`. C# dispatch: `backend/Handlers/MessageHandler.cs`.

Responses: lowercase JSON keys `id`, `type` (`response` | `error`), `data` / `error`. Main converts PascalCase `data` to camelCase.

## IPC channels (renderer -> main)

Mirror these in **three places** when adding one: `src/preload/index.ts`, `src/preload/index.d.ts`, `src/main/handlers.ts`.

### Backend status

| Channel | Preload API |
|---------|-------------|
| `backend:getStatus` | `window.api.backend.getStatus()` |
| Event `backend-status-changed` | `window.api.backend.onStatusChange(cb)` |

### Scripts (global)

| Channel | Preload API |
|---------|-------------|
| `script:get-status` | `window.api.script.getStatus()` |
| `script:cancel` | `window.api.script.cancel()` (also sends backend `stop`) |
| Event `script-status-changed` | `window.api.script.onStatusChange(cb)` |

### World 2

| Channel | Preload API |
|---------|-------------|
| `script:world-2.weekly-battle.fetch` | `window.api.script.world2.weeklyBattle.fetch()` |
| `script:world-2.weekly-battle.get` | `...get()` |
| `script:world-2.weekly-battle.run` | `...run(steps)` |
| Event `weekly-battle-data-changed` | `...onChange(cb)` |

### World 3

| Channel | Preload API |
|---------|-------------|
| `script:world-3.construction.solver` | `window.api.script.world3.construction.solver(inventory, weights, solveTime?)` |
| `script:world-3.construction.apply` | `...apply(steps)` |
| `script:world-3.construction.collect-cogs` | `...collectCogs()` |
| `script:world-3.construction.trash-cogs` | `...trashCogs()` |

### World 6

| Channel | Preload API |
|---------|-------------|
| `script:world-6.farming.start` | `window.api.script.world6.farming.start()` |
| `script:world-6.farming.lock-unlock` | `...lockUnlock()` |
| `script:world-6.summoning.start-endless-autobattler` | `window.api.script.world6.summoning.startEndlessAutobattler()` |
| `script:world-6.summoning.start-autobattler` | `...startAutobattler()` |

### General

| Channel | Preload API |
|---------|-------------|
| `script:general.test.run` | `window.api.script.general.test.run()` |
| `script:general.store-items.run` | `window.api.script.general.storeItems.run()` |

### App, updates, logs

| Channel | Preload API |
|---------|-------------|
| `app:isDev` | `window.api.app.isDev()` |
| `update:*` | `window.api.update.*` (check, download, install, getVersion, getStatus + events) |
| `logs:get` | `window.api.logs.get()` |
| Event `logs-changed` | `window.api.logs.onChange(cb)` |

### Window

| Channel | Preload API |
|---------|-------------|
| `window-close` (send) | `window.api.window.close()` |

## Navigation (renderer)

There is **no react-router**. Navigation is a Zustand store:

- **Store:** `src/renderer/src/store/navigation.ts` — type `NavigationPage` + `useNavigationStore`.
- **Sidebar labels/paths:** `src/renderer/src/app/sidebar/app-sidebar.tsx` — `getNavItems()` must list every page; `setPage(page)` switches view.
- **Page components:** `src/renderer/src/app/app.tsx` — `pageMap` keys must match `NavigationPage`; add the lazy/imported component there.

**Checklist for a new page:**

1. Add a literal to `NavigationPage` in `navigation.ts`.
2. Add nav entry in `app-sidebar.tsx` (`getNavItems`).
3. Import page in `app.tsx` and add to `pageMap`.
4. If dev-only, follow `general/test` pattern (`isDev` + `devOnly` + conditional `pageMap`).

## Main-process navigation helpers (automation)

Scripts that move the game UI use **`src/main/scripts/navigation/`** (`ui`, `codex`, `construction`, `quickRef`). These are **not** IPC routes; they are imported by feature scripts under `src/main/scripts/`.

## Related audit docs

- `docs/backend-audit.md`, `docs/frontend-audit.md` — deeper reviews; this file is the **agent operations** summary.
