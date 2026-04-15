# Developer Guide: Adding Scripts and Pages

Practical reference for adding automation scripts and UI pages to the Electron + React app.

---

## Architecture Overview

Scripts run in the **main process** and are invoked from the **renderer** via `window.api.script.run(scriptId, ...args)`. The renderer uses `<ScriptPage>` to wire up run/cancel buttons automatically.

Key directories:

- `src/main/scripts/` — main-process automation scripts
- `src/renderer/src/app/pages/` — renderer page components
- `src/renderer/src/app/page-registry.ts` — lazy-loaded page map
- `src/renderer/src/app/nav-config.ts` — sidebar navigation
- `src/types/scripts.ts` — typed script map for args/result inference

---

## 1. Adding a New Script

### Create the script file

Scripts live at `src/main/scripts/<world>/<script-name>.ts`. Use `defineScript()` — it handles cancellation tokens, logging, and the "already running" guard automatically.

```ts
// src/main/scripts/world6/my-script.ts
import { backendCommand } from "../../backend/index";
import { logger } from "../../utils/index";
import { defineScript } from "../define-script";

export default defineScript({
  id: "world6.myFeature.run",  // dot-separated: world.feature.action
  name: "My Feature",
  run: async ({ token }) => {
    logger.log("my-feature - starting");
    token.throwIfCancelled();
    await backendCommand.click({ x: 100, y: 200 }, undefined, token);
  },
});
```

The `ScriptContext` provides:
- `token` — `CancellationToken`; call `token.throwIfCancelled()` inside loops and between async operations
- `args` — typed tuple from `TArgs` generic (defaults to `[]`)

Always import these directly (never pass as function parameters):
- `backendCommand` from `../../backend/index` — backend commands (find, click, etc.)
- `logger` from `../../utils/index` — structured logger whose output appears in the Logs page

### Backend Command API

All commands take `CancellationToken` as the last argument and `undefined` for default options.

**Single-image commands:**

| Command | Signature | Description |
|---------|-----------|-------------|
| `find` | `(imagePath, options?, token) → Point[]` | Blocking search with retry (default 5s timeout, 50ms interval) |
| `isVisible` | `(imagePath, options?, token) → Point[]` | Non-blocking check (50ms timeout) |
| `findAndClick` | `(imagePath, options?, token) → boolean` | Find then click first match |
| `click` | `(point, options?, token) → ClickResponse` | Click at coordinates |
| `drag` | `(start, end, options?, token) → DragResponse` | Drag between points |
| `scroll` | `(point, delta, options?, token) → ScrollResponse` | Scroll at point |
| `keyPress` | `(key, options?, token) → KeyPressResponse` | Press a key |

**Parallel commands** — check/find multiple images in one call:

| Command | Signature | Description |
|---------|-----------|-------------|
| `isVisibleParallel` | `(images, options?, token) → Record<string, Point[]>` | Non-blocking check for all images |
| `findParallel` | `(images, options?, token) → Record<string, Point[]>` | Blocking search with retry for all images |

The `images` parameter is a `Record<string, string>` — keys are your chosen labels, values are image paths. Results use the same keys:

```ts
const vis = await backendCommand.isVisibleParallel(
  { back: "ui/farming/back", info: "ui/farming/crop_info" },
  undefined,
  token
);
if (vis.back.length > 0) { /* back button visible */ }
if (vis.info.length > 0) { /* crop info visible */ }

const found = await backendCommand.findParallel(
  { "4": "ui/farming/og_4", "5": "ui/farming/og_5" },
  { timeoutMs: 60000 },
  token
);
// found["4"] → Point[], found["5"] → Point[]
```

**Click presets** — import `getClickOptionsFromPreset` from `../../backend/index` and pass a speed string:

```ts
const clickOptions = getClickOptionsFromPreset("2x");
await backendCommand.click(point, clickOptions, token);
```

Presets (interval / holdTime relative to `1x` at 100ms / 80ms): `"0.5x"` (slower), `"1x"`, `"2x"`, `"4x"`, `"8x"`, `"16x"` (faster). Bigger number = faster.

### Export from the barrel

```ts
// src/main/scripts/world6/index.ts
import myScript from "./my-script";
// ...existing imports

export const world6Scripts = [
  // ...existing scripts,
  myScript,
];
```

### Register in ScriptMap (only if the script has typed args or a typed return value)

Scripts with `args: []` and `result: undefined` do not strictly require a `ScriptMap` entry — the renderer will still call them. Add an entry only when args or return type need to be enforced in the renderer:

```ts
// src/types/scripts.ts
export type ScriptMap = {
  // ...existing entries
  "world6.myFeature.run": { args: []; result: undefined };
  // example with args:
  "world6.myFeature.apply": { args: [MyArg[]]; result: undefined };
};
```

---

## 2. Adding a New Page

### Create the page component

Simple pages with one or more script buttons use `<ScriptPage>` — no boilerplate needed:

```tsx
// src/renderer/src/app/pages/world-6/my-feature.tsx
import { ScriptPage } from "@/components/script-page";

const MyFeature = () => (
  <ScriptPage
    title="My Feature"
    actions={[
      { label: "Run Script", scriptId: "world6.myFeature.run" },
    ]}
  />
);

export default MyFeature;
```

`ScriptAction` fields:
- `label` — button text and section heading (required)
- `scriptId` — must be a key of `ScriptMap` (required)
- `runningLabel` — override for the in-progress button label (default: `"Running... (Click to stop)"`)
- `args` — zero-arg function returning the args tuple, e.g. `args: () => [myState]`
- `onResult` — callback receiving the typed return value

With two or more actions the buttons render in a 2-column grid; with one action they are centered.

`<ScriptPage>` also accepts `children` rendered above the button grid, useful for status cards or configuration controls (see Construction for an example).

### Add to the page registry

```ts
// src/renderer/src/app/page-registry.ts
export const pageRegistry = {
  // ...existing entries
  "world6/my-feature": () => import("./pages/world-6/my-feature"),
} as const satisfies Record<string, () => Promise<{ default: React.ComponentType }>>;
```

Use the path convention `"<world>/<feature>"` for world-scoped pages. Top-level pages (like `dashboard`) use a plain key.

### Add to the nav config

```ts
// src/renderer/src/app/nav-config.ts
{
  title: "World 6",
  items: [
    { title: "Summoning", page: "world6/summoning" },
    { title: "Farming",   page: "world6/farming" },
    { title: "My Feature", page: "world6/my-feature" },  // add here
  ],
},
```

Add `devOnly: true` to hide the item outside development mode:

```ts
{ title: "Test Page", page: "general/test", devOnly: true }
```

---

## 3. Adding a New World

When none of the existing world barrels is the right home for the scripts, create a new one.

1. **Create the world barrel** at `src/main/scripts/<world>/index.ts`, exporting a `<world>Scripts` array.

2. **Register in the top-level aggregator**:

```ts
// src/main/scripts/index.ts
import { world7Scripts } from "./world7";

export const allScripts: ScriptDescriptor[] = [
  ...generalScripts,
  // ...existing worlds
  ...world7Scripts,
];
```

3. **Create a nav group** in `nav-config.ts`:

```ts
{
  title: "World 7",
  items: [
    { title: "My Feature", page: "world7/my-feature" },
  ],
},
```

4. Follow the normal script and page steps above for each feature.

---

## 4. Custom Pages

Use a custom page component instead of `<ScriptPage>` when:

- The set of script buttons is **data-driven** (not static at compile time) — e.g. `WeeklyBattle`, where button count depends on fetched API data
- The page needs to call **non-script IPC** (e.g. a solver that returns data before running a script)
- The page has **complex pre-run state** that would make an `args` factory awkward

### Patterns from existing custom pages

**WeeklyBattle** (`src/renderer/src/app/pages/world-2/weekly-battle.tsx`) — builds `<Button>` elements from fetched data, replicates the `isWorking` / `activeScript` state pattern that `ScriptPage` encapsulates internally, and calls `window.api.script.run(id, ...args)` directly.

**Construction** (`src/renderer/src/app/pages/world-3/construction.tsx`) — uses `<ScriptPage>` for the script buttons but renders UI content (solver controls, results) as `children`. The `args` callback reads from component state: `args: () => [solverResult?.steps ?? []]`. The solver itself is called via a dedicated non-script IPC method (`window.api.script.world3.construction.solver`) that returns data without going through the cancellation manager.

When writing a custom page:
- Track `isWorking` via `useMainState("scriptStatus")`
- Maintain a local `activeScript` string to know which button is in the "running" state
- Call `window.api.script.cancel()` when the active button is clicked again
- Surface cancellation (`"Operation was cancelled"`) silently — it is not an error

---

## 5. Quick Reference Checklist

### Simple script + page (most common case)

1. Create `src/main/scripts/<world>/<script-name>.ts` using `defineScript()`
2. Add the default export to `src/main/scripts/<world>/index.ts`
3. If the script has typed args or a return value, add an entry to `src/types/scripts.ts` — `ScriptMap`
4. Create `src/renderer/src/app/pages/<world>/<page-name>.tsx` using `<ScriptPage>`
5. Add a lazy import to `src/renderer/src/app/page-registry.ts`
6. Add a nav item to `src/renderer/src/app/nav-config.ts`

### New world (additional steps)

7. Create `src/main/scripts/<world>/index.ts` exporting a `<world>Scripts` array
8. Spread `<world>Scripts` into `allScripts` in `src/main/scripts/index.ts`
9. Add a `NavGroup` entry to `nav-config.ts`

### Custom page (replace step 4)

4. Build the page manually using `useMainState`, `window.api.script.run`, and `window.api.script.cancel` — see `weekly-battle.tsx` as the reference for data-driven buttons and `construction.tsx` for the `<ScriptPage children>` hybrid pattern
