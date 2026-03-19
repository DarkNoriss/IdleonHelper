# Frontend audit (renderer) — inconsistencies & safety

Date: 2026-03-19

Scope: `src/renderer/` (React renderer) + `src/preload/` (renderer API boundary).

## Executive summary

The renderer is generally clean and lint passes, but there are **two high-impact boundary issues** in `preload` that can cause subtle runtime bugs and undermine type safety:

- **Event listener cleanup uses `removeAllListeners`**, which can unintentionally remove listeners created by other components.
- **Preload implementation is looser than its `.d.ts`**, so the renderer may trust types that aren’t enforced at runtime.

There are also some consistency issues (naming/paths) and a correctness/perf issue where **all pages remain mounted** even when hidden.

## Findings (prioritized)

### P0 — correctness & safety

#### 1) IPC subscription cleanup is too broad (`removeAllListeners`)

**Where**

- `src/preload/index.ts`: `backend.onStatusChange`, `script.onStatusChange`, `logs.onChange`, `update.onStatusChange`, `update.onDownloadProgress`, `script.world2.weeklyBattle.onChange`

**What / why it matters**

Each subscription returns a cleanup function that calls `ipcRenderer.removeAllListeners(channel)`. If multiple components subscribe to the same channel, unmounting any one of them will remove *all* listeners for that channel. This can cause:

- **Non-local bugs** (a component stops receiving updates because another component unmounted).
- **Hard-to-debug behavior** (order-dependent).
- **Reduced safety** (makes it easy to break status/update reporting with unrelated UI changes).

**Recommendation**

- Use a dedicated handler per subscription and unsubscribe with `ipcRenderer.removeListener(channel, handler)` (or `ipcRenderer.off`).
- Prefer `ipcRenderer.on(channel, handler)` and return `() => ipcRenderer.off(channel, handler)`.

**Acceptance test ideas**

- Mount two components that call the same `onStatusChange`. Unmount one; ensure the other still receives updates.

#### 2) Preload typing and runtime implementation are inconsistent

**Where**

- `src/preload/index.d.ts` declares strong types for `window.api`.
- `src/preload/index.ts` uses loose types (`unknown`, `string`, structural drift) for several handlers and callbacks.

Examples:

- `weeklyBattle.onChange` is typed as `(data: WeeklyBattleData | null) => void` in `.d.ts` but implemented as `(data: unknown) => void`.
- `update.onStatusChange` uses `status: string` in implementation while `.d.ts` narrows status to a union.

**What / why it matters**

The renderer relies on `.d.ts` types for compile-time safety, but the actual boundary doesn’t enforce those shapes. This can:

- Lead to runtime exceptions if payload shape changes.
- Make refactors appear safe while actually breaking at runtime.

**Recommendation**

- Align `src/preload/index.ts` signatures with `index.d.ts`.
- Add lightweight runtime validation for IPC payloads at the boundary (even minimal shape checks).

### P1 — correctness / maintainability

#### 3) All pages are mounted and toggled via CSS (`hidden`)

**Where**

- `src/renderer/src/app/app.tsx`: maps over all pages and toggles visibility with `hidden`.

**What / why it matters**

Even when hidden, components remain mounted and can:

- Keep effects/subscriptions alive (e.g. `window.api.*.onChange`).
- Hold state, do work, or allocate memory.
- Make behavior harder to reason about (“why is this effect running when I’m not on that page?”).

**Recommendation**

- Render only the active page (e.g. `pageMap[currentPage] ?? <NotFound />`) or adopt a router.

### P2 — inconsistencies (naming, conventions)

#### 4) Naming conventions differ between navigation vs script identifiers

**Where**

- Navigation pages: `NavigationPage` includes keys like `"general/store-items"`, `"world3/construction"`.
- Script names: `ScriptName` uses dot-separated strings like `"general.storeItems"`, `"world3.construction.apply"`.

**Impact**

Not a direct bug, but increases cognitive load and risk of mismatch as the app grows.

**Recommendation**

- Centralize identifiers (constants) and use one separator convention per domain.
- Consider deriving navigation keys from a single source of truth.

#### 5) Inconsistent import path for shared types

**Where**

- `src/renderer/src/app/pages/world-3/construction.tsx` imports from `@/../../types/construction`.

**Impact**

Escaping the alias root is brittle and inconsistent with `tsconfig.web.json` path mapping (`@/types/*` exists).

**Recommendation**

- Use `@/types/...` consistently for shared renderer-visible types.

### P3 — data safety / UX

#### 6) Raw JSON persistence trade-offs

**Where**

- `src/renderer/src/store/raw-json.ts` persists `rawJson` to storage (`raw-json-storage`).

**Impact**

- Potentially large payloads (storage limits, startup latency).
- Leaves user data on disk longer than necessary.

**Recommendation**

- Consider persisting only a subset / parsed slices.
- Add a size guard or “do not persist raw JSON” option.

## Current lint status

- `pnpm lint` passes cleanly (as of 2026-03-19).

## Suggested next steps

1) Fix `preload` unsubscribe logic (P0).
2) Align `preload` types with runtime + add boundary validation (P0).
3) Render only the active page in `App` (P1).
4) Normalize naming conventions and imports (P2).

