# Architecture Refactor Design

## Problem Statement

Adding a new world feature currently requires touching 9 files with significant boilerplate. State is scattered across main process memory, renderer Zustand stores, and localStorage. All pages are mounted simultaneously (hidden-div routing) which prevents proper page lifecycle and data fetching. The `navigation/` folder name is misleading (it's game UI automation, not app navigation).

## Goals

1. **Reduce ceremony**: Adding a new script feature should require minimal boilerplate (2 files of real work + 4 one-liners)
2. **Main process as source of truth**: All feature state lives in main process, renderer subscribes reactively
3. **Proper page lifecycle**: Lazy-load pages so they mount/unmount on navigation
4. **Consistent patterns**: Every script follows the same descriptor convention, every page uses the same template
5. **Preserve all existing functionality**: This is a refactor, not a rewrite

## Non-Goals

- Changing the C# .NET backend or its WebSocket protocol
- Adding React Router (custom routing is fine, just needs lazy loading)
- Redesigning the UI/look-and-feel
- Adding new features (only restructuring existing ones)

---

## Section 1: Script Descriptor System

### `defineScript()` Factory

Located at `src/main/scripts/define-script.ts`.

Every script exports a descriptor created via `defineScript()` instead of a raw function. The factory wraps the user-provided `run` function with:

- Cancellation check (is another script running?)
- Token creation via `cancellationManager.createToken()`
- Automatic try/catch that distinguishes cancellation from real errors
- Automatic `cancellationManager.clearToken()` in finally block
- Logging of script start/end

```typescript
// Type signature
function defineScript<TArgs extends unknown[] = [], TResult = void>(config: {
  id: string;           // Unique ID, doubles as IPC channel suffix
  name: string;         // Human-readable name for logging/UI
  run: (context: {
    token: CancellationToken;
    backend: typeof backendCommand;
    logger: typeof logger;
    args: TArgs;
  }) => Promise<TResult>;
}): ScriptDescriptor<TArgs, TResult>;
```

### Script Examples

**Simple script (no args, no return):**
```typescript
// src/main/scripts/world6/farming-start.ts
import { defineScript } from "../define-script";

export default defineScript({
  id: "world6.farming.start",
  name: "Start Farming",

  run: async ({ token, backend }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      const [og3, og4, og5] = await Promise.all([
        backend.find("farming/og-3", { threshold: 0.9925, timeoutMs: 100 }, token),
        backend.find("farming/og-4", { threshold: 0.9925, timeoutMs: 100 }, token),
        backend.find("farming/og-5", { threshold: 0.9925, timeoutMs: 100 }, token),
      ]);
      const allCoordinates = [...og3.matches, ...og4.matches, ...og5.matches];
      for (const coord of allCoordinates) {
        token.throwIfCancelled();
        await backend.click(coord, { times: 1, interval: 50, holdTime: 30 }, token);
      }
    }
  },
});
```

**Script with args and return value:**
```typescript
// src/main/scripts/world3/construction-solver.ts
import { defineScript } from "../define-script";
import type { ParsedConstructionData, SolverWeights, Score, OptimalStep } from "../../types/construction";

export default defineScript<
  [ParsedConstructionData, SolverWeights, number?],
  { score: Score; steps: OptimalStep[] } | null
>({
  id: "world3.construction.solver",
  name: "Construction Solver",

  run: async ({ args: [inventory, weights, solveTime], token }) => {
    // solver logic - returns result
  },
});
```

### What the Descriptor Object Contains

After `defineScript()` processes the config, the returned `ScriptDescriptor` has:

- `id: string` - used as IPC channel suffix
- `name: string` - for logging
- `execute(...args: TArgs): Promise<TResult>` - the wrapped function with all boilerplate

---

## Section 2: Script Registry & Auto-Registration

### Registry

Located at `src/main/scripts/registry.ts`.

Collects all script descriptors and registers IPC handlers automatically.

```typescript
import { ipcMain } from "electron";
import { generalScripts } from "./general";
import { world2Scripts } from "./world2";
import { world3Scripts } from "./world3";
import { world6Scripts } from "./world6";

const allScripts = [
  ...generalScripts,
  ...world2Scripts,
  ...world3Scripts,
  ...world6Scripts,
];

export function registerAllScripts(): void {
  for (const script of allScripts) {
    ipcMain.handle(`script:${script.id}`, async (_event, ...args) => {
      logger.log(`IPC: script:${script.id}`);
      return await script.execute(...args);
    });
  }
}

// Also register cancel and status handlers
export function registerScriptSystemHandlers(): void {
  registerAllScripts();
  ipcMain.handle("script:cancel", async () => { ... });
  ipcMain.handle("script:get-status", async () => { ... });
}
```

### World Barrel Files

Each world folder exports a flat array of descriptors:

```typescript
// src/main/scripts/world6/index.ts
import farmingStart from "./farming-start";
import farmingLockUnlock from "./farming-lock-unlock";
import summoning from "./summoning";

export const world6Scripts = [farmingStart, farmingLockUnlock, summoning];
```

### handlers.ts Simplification

`handlers.ts` shrinks to only system (non-script) handlers:

```typescript
export const setupHandlers = (): void => {
  registerScriptSystemHandlers(); // one call registers ALL scripts

  // System handlers only
  ipcMain.on("window-close", () => { ... });
  ipcMain.handle("backend:getStatus", ...);
  ipcMain.handle("app:isDev", ...);
  // update handlers
  // log handlers
  // state handlers (see Section 3)
};
```

### Shared Type Map

Located at `src/types/scripts.ts`. Maps script IDs to their arg/return types for type-safe IPC:

```typescript
export type ScriptMap = {
  "world6.farming.start": { args: []; result: void };
  "world6.farming.lockUnlock": { args: []; result: void };
  "world6.summoning.startAutobattler": { args: []; result: void };
  "world6.summoning.startEndlessAutobattler": { args: []; result: void };
  "world3.construction.solver": {
    args: [ParsedConstructionData, SolverWeights, number?];
    result: { score: Score; steps: OptimalStep[] } | null;
  };
  "world3.construction.apply": { args: [OptimalStep[]]; result: void };
  "world3.construction.collectCogs": { args: []; result: void };
  "world3.construction.trashCogs": { args: []; result: void };
  "world2.weeklyBattle.fetch": { args: []; result: WeeklyBattleData };
  "world2.weeklyBattle.get": { args: []; result: WeeklyBattleData | null };
  "world2.weeklyBattle.run": { args: [number[]]; result: void };
  "general.test.run": { args: []; result: void };
  "general.storeItems.run": { args: []; result: void };
};
```

### Generic Preload Bridge

The preload script exposes one generic `run` method instead of per-script methods:

```typescript
// src/preload/index.ts
script: {
  run: (id: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(`script:${id}`, ...args);
  },
  cancel: () => ipcRenderer.invoke("script:cancel"),
}
// Status and change events handled via state.get/state.subscribe (Section 3)
```

Type safety is enforced on the renderer side via the `ScriptMap` type:

```typescript
// src/preload/index.d.ts
script: {
  run: <T extends keyof ScriptMap>(
    id: T,
    ...args: ScriptMap[T]["args"]
  ) => Promise<ScriptMap[T]["result"]>;
  cancel: () => Promise<void>;
};
```

Note: `getStatus` and `onStatusChange` are removed from `script` - replaced by `state.get("scriptStatus")` and `state.subscribe("scriptStatus")` (see Section 3). This eliminates the duplicated status tracking between main and renderer.

### ScriptMap Maintenance

`ScriptMap` is manually maintained in `src/types/scripts.ts`. TypeScript cannot auto-derive types across Electron's process boundary (main ↔ renderer). When adding a new script with args or a return value, add its entry to `ScriptMap`. Scripts with no args and void return can optionally be omitted (the generic fallback handles them).

---

## Section 3: StateHub - Main Process State Manager

### Purpose

Central state store in the main process. Replaces scattered state (weekly battle data in main memory, script status duplicated between main and renderer, construction results in component useState).

### Location

`src/main/state-hub.ts`

### State Shape

```typescript
type AppState = {
  scriptStatus: {
    current: string | null;  // script ID currently running
    isWorking: boolean;
  };
  backendStatus: {
    status: "connecting" | "connected" | "error";
    error: string | null;
  };
  weeklyBattle: {
    data: WeeklyBattleData | null;
    fetchedAt: string | null;
  };
  // Extensible: add new state keys for new features
};
```

### API

```typescript
// Set state and auto-push to renderer
setState<K extends keyof AppState>(key: K, value: AppState[K]): void;

// Get current state (used by IPC handler for initial load)
getState<K extends keyof AppState>(key: K): AppState[K];
```

### How It Pushes to Renderer

When `setState` is called, it sends an IPC event `state:<key>` to the renderer:

```typescript
function setState<K extends keyof AppState>(key: K, value: AppState[K]): void {
  state[key] = value;
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send(`state:${key}`, value);
  }
}
```

### IPC Handlers for StateHub

Registered in `handlers.ts`:

```typescript
ipcMain.handle("state:get", (_event, key: string) => getState(key));
```

### Preload Bridge for State

```typescript
// src/preload/index.ts
state: {
  get: (key: string) => ipcRenderer.invoke("state:get", key),
  subscribe: (key: string, callback: (value: unknown) => void) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on(`state:${key}`, handler);
    return () => ipcRenderer.off(`state:${key}`, handler);
  },
}
```

Type-safe on renderer side via `index.d.ts`:

```typescript
state: {
  get: <K extends keyof AppState>(key: K) => Promise<AppState[K]>;
  subscribe: <K extends keyof AppState>(
    key: K,
    callback: (value: AppState[K]) => void
  ) => () => void;
};
```

### Renderer Hook

```typescript
// src/renderer/src/hooks/use-main-state.ts
function useMainState<K extends keyof AppState>(key: K): AppState[K] | null {
  const [value, setValue] = useState<AppState[K] | null>(null);

  useEffect(() => {
    window.api.state.get(key).then(setValue);
    return window.api.state.subscribe(key, setValue);
  }, [key]);

  return value;
}
```

### What Gets Removed from Renderer

- `src/renderer/src/store/script-status.ts` - replaced by `useMainState("scriptStatus")`
- `src/renderer/src/store/game-data.ts` - replaced by `useMainState("weeklyBattle")` etc.
- `src/renderer/src/providers/game-data-provider.tsx` - simplified or removed

### What Stays in Renderer

- `src/renderer/src/store/navigation.ts` - UI-only state (current page)
- `src/renderer/src/store/raw-json.ts` - user input persistence (localStorage)
- `src/renderer/src/providers/theme-provider.tsx` - UI-only

### Integration with Scripts

The `defineScript` wrapper updates StateHub automatically:

```typescript
// Inside defineScript's execute() wrapper:
stateHub.setState("scriptStatus", { current: script.id, isWorking: true });
try {
  const result = await script.run(context);
  return result;
} finally {
  stateHub.setState("scriptStatus", { current: null, isWorking: false });
}
```

### Integration with Existing Systems

- `cancellationManager` updates StateHub instead of sending raw IPC events
- `initializeBackend()` updates `stateHub.setState("backendStatus", ...)`
- Weekly battle fetch updates `stateHub.setState("weeklyBattle", ...)`
- All `mainWindow.webContents.send("*-changed")` calls replaced with `stateHub.setState()`

---

## Section 4: ScriptPage Template & Lazy Loading

### ScriptPage Component

Located at `src/renderer/src/components/script-page.tsx`.

A reusable page component that handles the common pattern: card with title, action buttons with start/stop/cancel logic, error display, and optional custom content.

```typescript
type ScriptAction = {
  label: string;                    // Button text
  scriptId: keyof ScriptMap;        // Which script to run
  runningLabel?: string;            // Text when running (default: "Running... (Click to stop)")
  args?: () => unknown[];           // Args factory (called on click)
  onResult?: (result: unknown) => void;  // Handle return value
};

type ScriptPageProps = {
  title: string;
  actions: ScriptAction[];
  children?: ReactNode;             // Custom content slot
};
```

### What ScriptPage Handles

- Subscribes to `useMainState("scriptStatus")` for current running script
- Derives `isRunning` per action (compares `scriptStatus.current` to `action.scriptId`)
- Derives `isWorking` (any script running = disable other buttons)
- Click handler: if running, cancel. If not, call `window.api.script.run(scriptId, ...args)`
- Error display with consistent styling
- Card layout: `Card > CardHeader > CardTitle > CardContent > children > actions`

### Usage Examples

**Simple page (farming):**
```tsx
export const Farming = () => (
  <ScriptPage
    title="Farming"
    actions={[
      { label: "Start Farming", scriptId: "world6.farming.start" },
      { label: "Lock/Unlock Crops", scriptId: "world6.farming.lockUnlock" },
    ]}
  />
);
```

**Page with custom content (construction):**
```tsx
export const Construction = () => {
  const [weights, setWeights] = useState<SolverWeights>({ ... });
  const [solverResult, setSolverResult] = useState(null);

  return (
    <ScriptPage
      title="Construction"
      actions={[
        {
          label: "Solve",
          scriptId: "world3.construction.solver",
          args: () => [gameData, weights, solveTime],
          onResult: setSolverResult,
        },
        {
          label: "Apply Steps",
          scriptId: "world3.construction.apply",
          args: () => [solverResult.steps],
        },
        { label: "Collect Cogs", scriptId: "world3.construction.collectCogs" },
        { label: "Trash Cogs", scriptId: "world3.construction.trashCogs" },
      ]}
    >
      <WeightsConfig value={weights} onChange={setWeights} />
      {solverResult && <SolverResults result={solverResult} />}
    </ScriptPage>
  );
};
```

### Lazy Loading

Replace the hidden-div routing in `app.tsx` with `React.lazy` + `Suspense`:

```tsx
import { lazy, Suspense } from "react";

const pages: Record<NavigationPage, React.LazyExoticComponent<() => JSX.Element>> = {
  dashboard: lazy(() => import("./pages/dashboard")),
  rawData: lazy(() => import("./pages/raw-data")),
  logs: lazy(() => import("./pages/general/logs")),
  weeklyBattle: lazy(() => import("./pages/world-2/weekly-battle")),
  farming: lazy(() => import("./pages/world-6/farming")),
  summoning: lazy(() => import("./pages/world-6/summoning")),
  "world3/construction": lazy(() => import("./pages/world-3/construction")),
  "general/store-items": lazy(() => import("./pages/general/store-items")),
};

// In render:
<Suspense fallback={<PageSkeleton />}>
  {(() => {
    const Page = pages[currentPage];
    return Page ? <Page /> : <Dashboard />;
  })()}
</Suspense>
```

**What this changes:**
- Only the active page is mounted. Others are unmounted (not hidden)
- Pages load on demand (code splitting via Vite)
- `useEffect` in pages fires on navigation entry - proper lifecycle
- With StateHub, data persists across navigation (main process holds it)

**Page components must use default exports** for `React.lazy` to work:
```typescript
// Each page file:
export default function Farming() { ... }
// or
const Farming = () => { ... };
export default Farming;
```

---

## Section 5: Folder Structure Changes

### Renames

| Current | New | Reason |
|---------|-----|--------|
| `src/main/scripts/navigation/` | `src/main/scripts/game-nav/` | Clarify it's game UI automation, not app navigation |

### New Files

| File | Purpose |
|------|---------|
| `src/main/scripts/define-script.ts` | `defineScript()` factory and `ScriptDescriptor` type |
| `src/main/scripts/registry.ts` | Collects descriptors, auto-registers IPC |
| `src/main/state-hub.ts` | Central state store |
| `src/types/scripts.ts` | `ScriptMap` and `AppState` shared types |
| `src/renderer/src/components/script-page.tsx` | Reusable script page template |
| `src/renderer/src/hooks/use-main-state.ts` | Hook to subscribe to StateHub |

### Removed Files

| File | Replaced By |
|------|-------------|
| `src/renderer/src/store/script-status.ts` | `useMainState("scriptStatus")` |
| `src/renderer/src/store/game-data.ts` | `useMainState(...)` or local state |
| `src/renderer/src/providers/game-data-provider.tsx` | StateHub subscriptions |

### Modified Files (Significant Changes)

| File | Change |
|------|--------|
| `src/main/handlers.ts` | Remove all script handlers, call `registerScriptSystemHandlers()` |
| `src/main/initialization.ts` | Initialize StateHub, update state instead of raw IPC |
| `src/main/utils/cancellation-token.ts` | Update StateHub instead of raw `webContents.send` |
| `src/preload/index.ts` | Replace per-script methods with generic `script.run()` and `state.*` |
| `src/preload/index.d.ts` | Update types for new API surface |
| `src/renderer/src/app/app.tsx` | Lazy loading, remove `Object.entries(pageMap).map` |
| `src/renderer/src/app/sidebar/app-sidebar.tsx` | No structural change, just add entries for new worlds |
| All script files in `src/main/scripts/` | Convert to `defineScript()` pattern |
| All page files in `src/renderer/src/app/pages/` | Convert to `<ScriptPage>` + default exports |

### Final Structure

```
src/
├── main/
│   ├── index.ts
│   ├── initialization.ts
│   ├── handlers.ts                  # system handlers only
│   ├── state-hub.ts                 # NEW
│   ├── backend/
│   │   ├── backend-client.ts
│   │   ├── backend-command.ts
│   │   ├── backend-config.ts
│   │   ├── backend-process.ts
│   │   └── backend-types.ts
│   ├── scripts/
│   │   ├── define-script.ts         # NEW
│   │   ├── registry.ts              # NEW
│   │   ├── game-nav/                # RENAMED
│   │   │   ├── helpers.ts
│   │   │   ├── ui.ts
│   │   │   ├── codex.ts
│   │   │   ├── construction.ts
│   │   │   └── quick-ref.ts
│   │   ├── general/
│   │   ├── world2/
│   │   ├── world3/
│   │   └── world6/
│   └── utils/
├── preload/
│   ├── index.ts                     # generic script.run() + state.*
│   └── index.d.ts                   # updated types
├── renderer/src/
│   ├── app/
│   │   ├── app.tsx                  # lazy loading
│   │   ├── app-header.tsx
│   │   ├── sidebar/
│   │   └── pages/                   # use ScriptPage template
│   ├── components/
│   │   ├── ui/
│   │   └── script-page.tsx          # NEW
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-main-state.ts        # NEW
│   ├── store/
│   │   ├── navigation.ts            # stays
│   │   └── raw-json.ts              # stays
│   ├── providers/
│   │   └── theme-provider.tsx        # stays
│   ├── lib/
│   └── styles/
├── parsers/
└── types/
    ├── construction.ts
    ├── raw-json.ts
    └── scripts.ts                   # NEW: ScriptMap, AppState
```

---

## Adding a New Feature Checklist

When adding a new World N feature after refactoring:

1. **Create script file** `src/main/scripts/worldN/my-feature.ts` using `defineScript()`
2. **Export from barrel** `src/main/scripts/worldN/index.ts` - add to array
3. **Register in registry** `src/main/scripts/registry.ts` - add `...worldNScripts`
4. **Add to ScriptMap** `src/types/scripts.ts` - add type entry (only if script has args/return)
5. **Create page** `src/renderer/src/app/pages/world-N/my-feature.tsx` using `<ScriptPage>`
6. **Add lazy import** `src/renderer/src/app/app.tsx` - one line in pages record
7. **Add sidebar entry** `src/renderer/src/app/sidebar/app-sidebar.tsx` - one line

Steps 1-2 are the real work. Steps 3-7 are one-liners.

---

## Migration Strategy

This refactor should be done incrementally, one system at a time:

1. **Phase 1**: Build `defineScript()` + registry. Convert one script (farming) as proof of concept. Verify it works end-to-end.
2. **Phase 2**: Build StateHub. Wire up `scriptStatus` and `backendStatus`. Remove `script-status.ts` store.
3. **Phase 3**: Build `<ScriptPage>` template. Convert farming page. Verify it works.
4. **Phase 4**: Add lazy loading to `app.tsx`. Convert pages to default exports.
5. **Phase 5**: Convert all remaining scripts and pages.
6. **Phase 6**: Rename `navigation/` to `game-nav/`. Update imports.
7. **Phase 7**: Clean up - remove old preload methods, old handlers, unused stores.

Each phase should result in a working app. No big-bang rewrite.
