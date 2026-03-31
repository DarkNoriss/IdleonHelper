# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Electron app to use convention-based script descriptors, a central StateHub, a reusable ScriptPage template, and lazy-loaded pages — reducing the ceremony for adding new features from 9 files to 2 files of real work + one-liners.

**Architecture:** Scripts export descriptors via `defineScript()` that auto-register IPC handlers. A `StateHub` in the main process owns all feature state and pushes changes to the renderer via IPC events. The renderer uses a `<ScriptPage>` template for common UI patterns and lazy-loads pages via `React.lazy`.

**Tech Stack:** Electron 39, React 19, TypeScript 5.9, Zustand 5, Vite 7, Tailwind 4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-31-architecture-refactor-design.md`

---

## Phase 1: Script Descriptor System + Registry

### Task 1: Create Shared Types

**Files:**
- Create: `src/types/scripts.ts`

- [ ] **Step 1: Create the ScriptMap and AppState types**

```typescript
// src/types/scripts.ts
import type {
  OptimalStep,
  ParsedConstructionData,
  Score,
  SolverWeights,
} from "./construction";

export type WeeklyBattleStep = {
  stepName: string;
  steps: number[];
  rawSteps: string[];
};

export type WeeklyBattleInfo = {
  dateFrom: string;
  dateTo: string;
  bossName: string;
  steps: WeeklyBattleStep[];
};

export type WeeklyBattleData = {
  fetchedAt: string;
  info: WeeklyBattleInfo;
};

export type ScriptMap = {
  "world6.farming.start": { args: []; result: void };
  "world6.farming.lockUnlock": { args: []; result: void };
  "world6.summoning.startAutobattler": { args: []; result: void };
  "world6.summoning.startEndlessAutobattler": { args: []; result: void };
  "world3.construction.apply": { args: [OptimalStep[]]; result: void };
  "world3.construction.collectCogs": { args: []; result: void };
  "world3.construction.trashCogs": { args: []; result: void };
  "world2.weeklyBattle.run": { args: [number[]]; result: void };
  "general.test.run": { args: []; result: void };
  "general.storeItems.run": { args: []; result: void };
};

export type ConnectionStatus = "connecting" | "connected" | "error";

export type AppState = {
  scriptStatus: {
    current: string | null;
    isWorking: boolean;
  };
  backendStatus: {
    status: ConnectionStatus;
    error: string | null;
  };
  weeklyBattle: {
    data: WeeklyBattleData | null;
    fetchedAt: string | null;
  };
};
```

Note: The construction solver is NOT in `ScriptMap` because it runs concurrently (doesn't use the cancellation/exclusive system). It stays as a regular IPC handler. Weekly battle `fetch` and `get` are also not scripts — they're data operations handled via StateHub.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS (new file, no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add src/types/scripts.ts
git commit -m "refactor(types): add ScriptMap and AppState shared types"
```

---

### Task 2: Create defineScript Factory

**Files:**
- Create: `src/main/scripts/define-script.ts`

- [ ] **Step 1: Create the defineScript factory**

```typescript
// src/main/scripts/define-script.ts
import { backendCommand } from "../backend";
import { cancellationManager, logger } from "../utils";
import type { CancellationToken } from "../utils/cancellation-token";

export type ScriptContext<TArgs extends unknown[] = []> = {
  token: CancellationToken;
  backend: typeof backendCommand;
  logger: typeof logger;
  args: TArgs;
};

export type ScriptConfig<TArgs extends unknown[] = [], TResult = void> = {
  id: string;
  name: string;
  run: (context: ScriptContext<TArgs>) => Promise<TResult>;
};

export type ScriptDescriptor = {
  id: string;
  name: string;
  execute: (...args: unknown[]) => Promise<unknown>;
};

export const defineScript = <TArgs extends unknown[] = [], TResult = void>(
  config: ScriptConfig<TArgs, TResult>
): ScriptDescriptor => {
  const execute = async (...args: unknown[]): Promise<TResult> => {
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running");
    }

    logger.log(`Starting script: ${config.name}`);
    const token = cancellationManager.createToken();

    try {
      const result = await config.run({
        token,
        backend: backendCommand,
        logger,
        args: args as unknown as TArgs,
      });
      logger.log(`Script completed: ${config.name}`);
      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log(`Script cancelled: ${config.name}`);
        return undefined as TResult;
      }
      throw error;
    } finally {
      cancellationManager.clearToken();
    }
  };

  return {
    id: config.id,
    name: config.name,
    execute,
  };
};
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/scripts/define-script.ts
git commit -m "refactor(scripts): add defineScript factory"
```

---

### Task 3: Create Script Registry

**Files:**
- Create: `src/main/scripts/registry.ts`

- [ ] **Step 1: Create the registry**

```typescript
// src/main/scripts/registry.ts
import { ipcMain } from "electron";

import { backendCommand } from "../backend";
import { cancellationManager, logger } from "../utils";
import type { ScriptDescriptor } from "./define-script";

let registeredScripts: ScriptDescriptor[] = [];

export const registerAllScripts = (scripts: ScriptDescriptor[]): void => {
  registeredScripts = scripts;

  for (const script of scripts) {
    ipcMain.handle(`script:${script.id}`, async (_event, ...args: unknown[]) => {
      logger.log(`IPC: script:${script.id}`);
      return await script.execute(...args);
    });
  }

  // System-level script handlers
  ipcMain.handle("script:cancel", async () => {
    logger.log("IPC: script:cancel");
    cancellationManager.cancelCurrent();
    try {
      await backendCommand.stop();
    } catch (error) {
      logger.error(
        `Failed to send stop command to backend: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  ipcMain.handle("script:get-status", () => {
    return cancellationManager.getStatus();
  });

  logger.log(`Registered ${scripts.length} scripts`);
};

export const getRegisteredScripts = (): ScriptDescriptor[] => registeredScripts;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/scripts/registry.ts
git commit -m "refactor(scripts): add script registry with auto IPC registration"
```

---

### Task 4: Convert World 6 Scripts to defineScript

**Files:**
- Modify: `src/main/scripts/world6/farming-start.ts`
- Modify: `src/main/scripts/world6/farming-lock-unlock.ts`
- Modify: `src/main/scripts/world6/summoning.ts`
- Modify: `src/main/scripts/world6/index.ts`

- [ ] **Step 1: Convert farming-start.ts**

Replace the entire file content of `src/main/scripts/world6/farming-start.ts`:

```typescript
import {
  ClickPreset,
  backendConfig,
  getClickOptionsFromPreset,
} from "../../backend";
import { defineScript } from "../define-script";

export default defineScript({
  id: "world6.farming.start",
  name: "Start Farming",

  run: async ({ token, backend, logger }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Searching for farming images with threshold 99.25%...");

      const threshold = 0.9925;
      const findOptions = {
        threshold,
        timeoutMs: backendConfig.isVisible.timeoutMs,
        intervalMs: backendConfig.find.intervalMs,
      };

      const [og3Result, og4Result, og5Result] = await Promise.all([
        backend.find("farming/og-3", findOptions, token),
        backend.find("farming/og-4", findOptions, token),
        backend.find("farming/og-5", findOptions, token),
      ]);

      const allCoordinates = [
        ...og3Result.matches,
        ...og4Result.matches,
        ...og5Result.matches,
      ];

      if (allCoordinates.length === 0) {
        logger.log("No farming images found, waiting before next iteration...");
        continue;
      }

      logger.log(
        `Found ${allCoordinates.length} farming images (og-3: ${og3Result.matches.length}, og-4: ${og4Result.matches.length}, og-5: ${og5Result.matches.length})`
      );

      if (og3Result.matches.length > 0) {
        logger.log(
          `og-3 matches (${og3Result.matches.length}): ${og3Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }
      if (og4Result.matches.length > 0) {
        logger.log(
          `og-4 matches (${og4Result.matches.length}): ${og4Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }
      if (og5Result.matches.length > 0) {
        logger.log(
          `og-5 matches (${og5Result.matches.length}): ${og5Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }

      const presetOptions = getClickOptionsFromPreset(ClickPreset.Extreme);
      for (const coordinate of allCoordinates) {
        token.throwIfCancelled();
        await backend.click(coordinate, presetOptions, token);
      }

      logger.log(`Clicked on ${allCoordinates.length} farming images`);
    }
  },
});
```

- [ ] **Step 2: Convert farming-lock-unlock.ts**

Replace the entire file content of `src/main/scripts/world6/farming-lock-unlock.ts`:

```typescript
import { ClickPreset, getClickOptionsFromPreset } from "../../backend";
import { delay } from "../../utils";
import { defineScript } from "../define-script";
import { FARMING_GRID } from "./farming-constants";

export default defineScript({
  id: "world6.farming.lockUnlock",
  name: "Lock/Unlock Crops",

  run: async ({ token, backend, logger }) => {
    token.throwIfCancelled();

    await delay(100, token);

    const startX = FARMING_GRID.FIRST_POSITION.x;
    const startY = FARMING_GRID.FIRST_POSITION.y;

    const allCoordinates: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < FARMING_GRID.ROWS; row++) {
      for (let col = 0; col < FARMING_GRID.COLUMNS; col++) {
        allCoordinates.push({
          x: startX + col * FARMING_GRID.X_STEP,
          y: startY + row * FARMING_GRID.Y_STEP,
        });
      }
    }

    logger.log(`Calculated ${allCoordinates.length} crop positions`);

    const presetOptions = getClickOptionsFromPreset(ClickPreset.Extreme);
    for (const coordinate of allCoordinates) {
      token.throwIfCancelled();
      await backend.click(coordinate, presetOptions, token);
    }

    logger.log(`Clicked on ${allCoordinates.length} crop positions`);
  },
});
```

- [ ] **Step 3: Convert summoning.ts**

Replace the entire file content of `src/main/scripts/world6/summoning.ts`:

```typescript
import { delay } from "../../utils";
import { defineScript } from "../define-script";

export const summoningStartEndless = defineScript({
  id: "world6.summoning.startEndlessAutobattler",
  name: "Endless Autobattler",

  run: async ({ token, logger }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Endless autobattler iteration...");
      await delay(60_000, token);
    }
  },
});

export const summoningStartAutobattler = defineScript({
  id: "world6.summoning.startAutobattler",
  name: "Autobattler",

  run: async ({ token, logger }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Autobattler iteration...");
      await delay(60_000, token);
    }
  },
});
```

- [ ] **Step 4: Update world6 barrel file**

Replace the entire file content of `src/main/scripts/world6/index.ts`:

```typescript
import farmingStart from "./farming-start";
import farmingLockUnlock from "./farming-lock-unlock";
import {
  summoningStartAutobattler,
  summoningStartEndless,
} from "./summoning";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  summoningStartEndless,
  summoningStartAutobattler,
];
```

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS (or failures in handlers.ts which we'll fix in Task 7)

- [ ] **Step 6: Commit**

```bash
git add src/main/scripts/world6/
git commit -m "refactor(world6): convert all scripts to defineScript pattern"
```

---

### Task 5: Convert World 2, World 3, and General Scripts

**Files:**
- Modify: `src/main/scripts/world2/weekly-battle.ts`
- Modify: `src/main/scripts/world2/index.ts`
- Modify: `src/main/scripts/world3/construction-apply.ts`
- Modify: `src/main/scripts/world3/collect-cogs.ts`
- Modify: `src/main/scripts/world3/trash-cogs.ts`
- Modify: `src/main/scripts/world3/index.ts`
- Modify: `src/main/scripts/general/test.ts`
- Modify: `src/main/scripts/general/store-items.ts`
- Modify: `src/main/scripts/general/index.ts`

- [ ] **Step 1: Convert weekly-battle.ts**

The weekly battle module has `fetch`, `get`, `run`, and `onChange`. Only `run` is a script. The others are data operations that will move to StateHub in Phase 2. For now, keep them as standalone exports alongside the script.

Replace the entire file content of `src/main/scripts/world2/weekly-battle.ts`:

```typescript
import { backendCommand } from "../../backend/backend-command";
import { getMainWindow } from "../../index";
import { logger } from "../../utils";
import { defineScript } from "../define-script";
import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "./weekly-battle-data";

// Coordinate constants for weekly battle steps
const STEP_1_COORDS = { x: 613, y: 337 };
const STEP_2_COORDS = { x: 613, y: 398 };
const STEP_3_COORDS = { x: 613, y: 459 };

// --- Data management (will move to StateHub in Phase 2) ---
let data: WeeklyBattleData | null = null;
const onChangeCallbacks: Array<(data: WeeklyBattleData | null) => void> = [];

const notifyChange = (newData: WeeklyBattleData | null): void => {
  data = newData;
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("weekly-battle-data-changed", newData);
  }
  for (const callback of onChangeCallbacks) {
    callback(newData);
  }
};

export const weeklyBattleFetch = async (): Promise<WeeklyBattleData> => {
  logger.log("Fetching weekly battle data...");
  const fetchedData = await fetchWeeklyBattleData();
  notifyChange(fetchedData);
  logger.log("Weekly battle data fetched successfully");
  return fetchedData;
};

export const weeklyBattleGet = async (): Promise<WeeklyBattleData | null> => {
  return data;
};

export const weeklyBattleOnChange = (
  callback: (data: WeeklyBattleData | null) => void
): (() => void) => {
  onChangeCallbacks.push(callback);
  callback(data);
  return () => {
    const index = onChangeCallbacks.indexOf(callback);
    if (index > -1) {
      onChangeCallbacks.splice(index, 1);
    }
  };
};

// --- Script ---
export default defineScript<[number[]]>({
  id: "world2.weeklyBattle.run",
  name: "Weekly Battle Run",

  run: async ({ args: [steps], token, logger }) => {
    logger.log(`Starting weekly battle run with ${steps.length} steps`);
    logger.log(`Weekly battle steps: ${steps.join(", ")}`);

    logger.log("Checking weekly battle state (cooldown, restart, select)...");
    const isOnCooldown = await backendCommand.isVisible(
      "weekly-battle/wait",
      undefined,
      token
    );
    const needsRestart = await backendCommand.isVisible(
      "weekly-battle/restart",
      undefined,
      token
    );
    const isSelectVisible = await backendCommand.isVisible(
      "weekly-battle/select",
      undefined,
      token
    );

    if (isOnCooldown) {
      logger.log("Weekly battle is on cooldown - cannot proceed");
      return;
    }

    if (needsRestart) {
      logger.log("Restarting weekly battle...");
      const clicked = await backendCommand.click(
        STEP_1_COORDS,
        undefined,
        token
      );
      if (clicked) {
        logger.log("Weekly battle restarted successfully");
        const isSelectVisibleAfterRestart = await backendCommand.isVisible(
          "weekly-battle/select",
          undefined,
          token
        );
        if (!isSelectVisibleAfterRestart) {
          logger.error("Weekly battle select screen not found after restart");
          throw new Error("Weekly battle select screen not found");
        }
        logger.log("Select screen confirmed after restart");
      } else {
        logger.error("Restart image found but no matches returned");
      }
    } else {
      if (!isSelectVisible) {
        logger.error("Weekly battle select screen not found");
        throw new Error("Weekly battle select screen not found");
      }
      logger.log("Select screen confirmed");
    }

    logger.log(`Executing ${steps.length} steps...`);
    const stepCoords = [STEP_1_COORDS, STEP_2_COORDS, STEP_3_COORDS];

    for (const stepNumber of steps) {
      if (stepNumber < 1 || stepNumber > 3) {
        logger.error(
          `Invalid step number: ${stepNumber}. Expected 1, 2, or 3.`
        );
        throw new Error(`Invalid step number: ${stepNumber}`);
      }

      const coords = stepCoords[stepNumber - 1]!;
      logger.log(
        `Clicking step ${stepNumber} at coordinates (${coords.x}, ${coords.y})`
      );
      await backendCommand.click(coords, undefined, token);
    }

    logger.log("Weekly battle run completed successfully");
  },
});
```

- [ ] **Step 2: Update world2 barrel**

Replace `src/main/scripts/world2/index.ts`:

```typescript
import weeklyBattleRun from "./weekly-battle";

export {
  weeklyBattleFetch,
  weeklyBattleGet,
  weeklyBattleOnChange,
} from "./weekly-battle";

export const world2Scripts = [weeklyBattleRun];
```

- [ ] **Step 3: Convert construction-apply.ts**

Replace the entire file content of `src/main/scripts/world3/construction-apply.ts`:

```typescript
import type { OptimalStep } from "../../../types/construction";
import { defineScript } from "../define-script";
import { navigation } from "../navigation";
import {
  BOARD_FIRST_COORDS,
  COGS_STEP,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants";

export const getSparePage = (y: number): number => {
  return Math.floor(y / SPARE_ROWS) + 1;
};

export const getSpareRowInPage = (y: number): number => {
  return y % SPARE_ROWS;
};

export const getSpareLocationAfterPageChange = (
  location: { x: number; y: number },
  targetPage: number
): { x: number; y: number } => {
  const rowInPage = getSpareRowInPage(location.y);
  const pageIndex = targetPage - 1;
  const newY = pageIndex * SPARE_ROWS + rowInPage;
  return {
    x: location.x,
    y: newY,
  };
};

const calculateBoardCoords = (
  x: number,
  y: number
): { x: number; y: number } => {
  return {
    x: BOARD_FIRST_COORDS.x + x * COGS_STEP,
    y: BOARD_FIRST_COORDS.y + y * COGS_STEP,
  };
};

const calculateSpareCoords = (
  x: number,
  y: number
): { x: number; y: number } => {
  const rowInPage = getSpareRowInPage(y);
  return {
    x: SPARE_FIRST_COORDS.x + x * COGS_STEP,
    y: SPARE_FIRST_COORDS.y + rowInPage * COGS_STEP,
  };
};

export default defineScript<[OptimalStep[]]>({
  id: "world3.construction.apply",
  name: "Apply Construction",

  run: async ({ args: [steps], token, backend, logger }) => {
    logger.log("Navigating to construction screen...");
    const navigationSuccess = await navigation.construction.toCogsTab(token);
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script");
      return;
    }

    logger.log("Ensuring cog shelf is off...");
    await navigation.construction.ensureCogShelfOff(token);

    logger.log("Ensuring trash is off...");
    await navigation.construction.ensureTrashOff(token);

    logger.log("Ensuring first page...");
    await navigation.construction.ensureFirstPage(token);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      logger.log(`Processing step ${i + 1}/${steps.length}`);

      let fromCoords: { x: number; y: number };
      let toCoords: { x: number; y: number };

      if (step.from.location === "board") {
        fromCoords = calculateBoardCoords(step.from.x, step.from.y);
      } else {
        const fromPage = getSparePage(step.from.y);
        await navigation.construction.navigateToPage(fromPage, token);
        fromCoords = calculateSpareCoords(step.from.x, step.from.y);
      }

      if (step.to.location === "board") {
        toCoords = calculateBoardCoords(step.to.x, step.to.y);
      } else {
        const toPage = getSparePage(step.to.y);
        await navigation.construction.navigateToPage(toPage, token);
        toCoords = calculateSpareCoords(step.to.x, step.to.y);
      }

      logger.log(
        `Dragging from (${fromCoords.x}, ${fromCoords.y}) to (${toCoords.x}, ${toCoords.y})`
      );
      await backend.drag(fromCoords, toCoords, { instant: true }, token);
    }

    logger.log("Optimized board applied successfully");
  },
});
```

- [ ] **Step 4: Convert collect-cogs.ts**

Replace the entire file content of `src/main/scripts/world3/collect-cogs.ts`:

```typescript
import { ClickPreset, getClickOptionsFromPreset } from "../../backend";
import { defineScript } from "../define-script";
import { navigation } from "../navigation";
import {
  COGS_STEP,
  COLLECT_ULTIMATE_COGS,
  SPARE_COLUMNS,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants";

export default defineScript({
  id: "world3.construction.collectCogs",
  name: "Collect Cogs",

  run: async ({ token, backend, logger }) => {
    logger.log("Navigating to cogs tab...");
    const navigationSuccess = await navigation.construction.toCogsTab(token);
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script");
      return;
    }

    logger.log("Ensuring cog shelf is open...");
    await navigation.construction.ensureCogShelfOn(token);

    logger.log("Ensuring last page...");
    await navigation.construction.ensureLastPage(token);

    logger.log("Ensuring trash is closed...");
    await navigation.construction.ensureTrashOff(token);

    const PADDING = 4;
    const lastSpareX = SPARE_FIRST_COORDS.x + (SPARE_COLUMNS - 1) * COGS_STEP;
    const lastSpareY = SPARE_FIRST_COORDS.y + (SPARE_ROWS - 1) * COGS_STEP;
    const spareAreaOffset = {
      left: SPARE_FIRST_COORDS.x - PADDING,
      top: SPARE_FIRST_COORDS.y - PADDING,
      right: lastSpareX + COGS_STEP + PADDING,
      bottom: lastSpareY + COGS_STEP + PADDING,
    };

    const MAX_ITERATIONS = 250;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      token.throwIfCancelled();

      logger.log("Checking if board is empty (within spare area)...");
      const isBoardEmpty = await backend.isVisible(
        "construction/board_empty",
        { offset: spareAreaOffset },
        token
      );

      if (!isBoardEmpty) {
        logger.log("Board is not empty (spare is full), collection complete");
        break;
      }

      iteration++;
      logger.log(
        `Board is empty, clicking collect ultimate cogs button 10 times (iteration ${iteration}/${MAX_ITERATIONS})...`
      );

      const presetOptions = getClickOptionsFromPreset(ClickPreset.UltraFast);
      await backend.click(
        COLLECT_ULTIMATE_COGS,
        { times: 10, ...presetOptions },
        token
      );
    }

    if (iteration >= MAX_ITERATIONS) {
      logger.log(`Reached maximum iterations (${MAX_ITERATIONS}), stopping`);
    }

    logger.log("Closing cog shelf...");
    await navigation.construction.ensureCogShelfOff(token);

    logger.log("Collect cogs completed successfully");
  },
});
```

- [ ] **Step 5: Convert trash-cogs.ts**

Replace the entire file content of `src/main/scripts/world3/trash-cogs.ts`:

```typescript
import { ClickPreset, getClickOptionsFromPreset } from "../../backend";
import { defineScript } from "../define-script";
import { navigation } from "../navigation";
import {
  COGS_STEP,
  SPARE_COLUMNS,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants";

export default defineScript({
  id: "world3.construction.trashCogs",
  name: "Trash Cogs",

  run: async ({ token, backend, logger }) => {
    logger.log("Navigating to cogs tab...");
    const navigationSuccess = await navigation.construction.toCogsTab(token);
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script");
      return;
    }

    logger.log("Ensuring cog shelf is off...");
    await navigation.construction.ensureCogShelfOff(token);

    logger.log("Ensuring first page...");
    await navigation.construction.ensureFirstPage(token);

    logger.log("Ensuring trash is open...");
    await navigation.construction.ensureTrashOn(token);

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      logger.log(`Processing page ${currentPage}...`);

      for (let col = 0; col < SPARE_COLUMNS; col++) {
        for (let row = 0; row < SPARE_ROWS; row++) {
          token.throwIfCancelled();

          const x = SPARE_FIRST_COORDS.x + col * COGS_STEP;
          const y = SPARE_FIRST_COORDS.y + row * COGS_STEP;

          const presetOptions = getClickOptionsFromPreset(
            ClickPreset.UltraFast
          );
          await backend.click({ x, y }, { times: 1, ...presetOptions }, token);
        }
      }

      const nextPageAvailable = await backend.isVisible(
        "construction/cogs-page-next",
        undefined,
        token
      );

      if (nextPageAvailable) {
        currentPage++;
        logger.log(`Navigating to page ${currentPage}...`);
        await navigation.construction.navigateToPage(currentPage, token);
      } else {
        hasNextPage = false;
        logger.log("Reached last page");
      }
    }

    logger.log("Closing trash...");
    await navigation.construction.ensureTrashOff(token);

    logger.log("Trash cogs completed successfully");
  },
});
```

- [ ] **Step 6: Update world3 barrel**

Replace `src/main/scripts/world3/index.ts`:

```typescript
import collectCogs from "./collect-cogs";
import constructionApply from "./construction-apply";
import trashCogs from "./trash-cogs";

// Solver is NOT a defineScript - it runs concurrently and has no cancellation.
// It stays as a regular IPC handler in handlers.ts.
export { solver } from "./construction-solver";

export const world3Scripts = [constructionApply, collectCogs, trashCogs];
```

- [ ] **Step 7: Convert general/test.ts**

Replace the entire file content of `src/main/scripts/general/test.ts`:

```typescript
import { defineScript } from "../define-script";
import { navigation } from "../navigation";

export default defineScript({
  id: "general.test.run",
  name: "Test Script",

  run: async ({ token, logger }) => {
    token.throwIfCancelled();
    logger.log("Test script: navigating to Codex...");
    await navigation.ui.toCodex(token);

    token.throwIfCancelled();
    logger.log("Test script: navigating to Items...");
    await navigation.ui.toItems(token);

    logger.log("Test script completed successfully");
  },
});
```

- [ ] **Step 8: Convert general/store-items.ts**

Replace the entire file content of `src/main/scripts/general/store-items.ts`:

```typescript
import { defineScript } from "../define-script";
import { navigation } from "../navigation";

export default defineScript({
  id: "general.storeItems.run",
  name: "Store Items",

  run: async ({ token, backend, logger }) => {
    token.throwIfCancelled();
    logger.log("Store items script: navigating to Storage...");
    await navigation.quickRef.toStorage(token);

    token.throwIfCancelled();
    logger.log("Checking if deposit_all button is visible...");
    const isDepositAllVisible = await backend.isVisible(
      "storage/deposit_all",
      undefined,
      token
    );

    if (isDepositAllVisible) {
      logger.log("deposit_all button is visible, clicking it...");
      const clicked = await backend.findAndClick(
        "storage/deposit_all",
        undefined,
        token
      );
      if (!clicked) {
        logger.log("Failed to click deposit_all button");
      }
    } else {
      logger.log(
        "deposit_all button not visible, clicking info.png to open info screen..."
      );
      const infoClicked = await backend.findAndClick(
        "storage/info",
        undefined,
        token
      );
      if (infoClicked) {
        logger.log("Info screen opened, now clicking deposit_all...");
        const depositAllClicked = await backend.findAndClick(
          "storage/deposit_all",
          undefined,
          token
        );
        if (!depositAllClicked) {
          logger.log("Failed to click deposit_all button after opening info");
        }
      } else {
        logger.log("Failed to click info.png");
      }
    }

    token.throwIfCancelled();
    logger.log("Clicking deposit_cash button...");
    const depositCashClicked = await backend.findAndClick(
      "storage/deposit_cash",
      undefined,
      token
    );
    if (!depositCashClicked) {
      logger.log("Failed to click deposit_cash button");
    }

    token.throwIfCancelled();
    logger.log("Clicking deposit_cash_max button...");
    const depositCashMaxClicked = await backend.findAndClick(
      "storage/deposit_cash_max",
      undefined,
      token
    );
    if (!depositCashMaxClicked) {
      logger.log("Failed to click deposit_cash_max button");
    }

    token.throwIfCancelled();
    logger.log("Clicking ui/items button...");
    const itemsClicked = await backend.findAndClick(
      "ui/items",
      undefined,
      token
    );
    if (!itemsClicked) {
      logger.log("Failed to click ui/items button");
    }

    logger.log("Store items script completed successfully");
  },
});
```

- [ ] **Step 9: Update general barrel**

Replace `src/main/scripts/general/index.ts`:

```typescript
import storeItems from "./store-items";
import test from "./test";

export const generalScripts = [test, storeItems];
```

- [ ] **Step 10: Verify typecheck**

Run: `pnpm typecheck`
Expected: May fail in handlers.ts and initialization.ts (old references). We fix those next.

- [ ] **Step 11: Commit**

```bash
git add src/main/scripts/world2/ src/main/scripts/world3/ src/main/scripts/general/
git commit -m "refactor(scripts): convert all scripts to defineScript pattern"
```

---

### Task 6: Update Root Scripts Index + Wire Registry into Handlers

**Files:**
- Modify: `src/main/scripts/index.ts`
- Modify: `src/main/handlers.ts`
- Modify: `src/main/initialization.ts`

- [ ] **Step 1: Update root scripts index**

Replace `src/main/scripts/index.ts`:

```typescript
import { generalScripts } from "./general";
import { world2Scripts } from "./world2";
import { world3Scripts } from "./world3";
import { world6Scripts } from "./world6";
import type { ScriptDescriptor } from "./define-script";

export const allScripts: ScriptDescriptor[] = [
  ...generalScripts,
  ...world2Scripts,
  ...world3Scripts,
  ...world6Scripts,
];

// Re-export non-script functions that handlers still needs
export { weeklyBattleFetch, weeklyBattleGet, weeklyBattleOnChange } from "./world2";
export { solver } from "./world3";

// Re-export navigation for scripts that use it
export { navigation } from "./navigation";
```

- [ ] **Step 2: Update handlers.ts**

Replace the entire file content of `src/main/handlers.ts`:

```typescript
import { is } from "@electron-toolkit/utils";
import { BrowserWindow, ipcMain } from "electron";

import type {
  ParsedConstructionData,
  SolverWeights,
} from "../types/construction";
import { getConnectionStatus, getLastError } from "./backend";
import { allScripts, solver, weeklyBattleFetch, weeklyBattleGet } from "./scripts";
import { registerAllScripts } from "./scripts/registry";
import {
  checkForUpdates,
  downloadUpdate,
  getCurrentVersion,
  getLogs,
  getUpdateStatus,
  installUpdate,
  logger,
} from "./utils";

export const setupHandlers = (): void => {
  logger.log("Setting up IPC handlers");

  // Register all script handlers automatically
  registerAllScripts(allScripts);

  // --- Window ---
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.close();
    }
  });

  // --- Weekly battle data (not a script - data operations) ---
  ipcMain.handle("script:world-2.weekly-battle.fetch", async () => {
    logger.log("IPC: script:world-2.weekly-battle.fetch");
    return await weeklyBattleFetch();
  });

  ipcMain.handle("script:world-2.weekly-battle.get", async () => {
    logger.log("IPC: script:world-2.weekly-battle.get");
    return await weeklyBattleGet();
  });

  // --- Construction solver (runs concurrently, not a defineScript) ---
  ipcMain.handle(
    "script:world-3.construction.solver",
    async (
      _event,
      inventory: ParsedConstructionData,
      weights: SolverWeights,
      solveTime?: number
    ) => {
      logger.log(
        `IPC: script:world-3.construction.solver (solveTime: ${solveTime ?? 1000})`
      );
      return await solver(inventory, weights, solveTime);
    }
  );

  // --- Backend ---
  ipcMain.handle("backend:getStatus", async () => {
    logger.log("IPC: backend:getStatus");
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    };
  });

  // --- Updates ---
  ipcMain.handle("update:check", async () => {
    logger.log("IPC: update:check");
    await checkForUpdates();
  });

  ipcMain.handle("update:download", async () => {
    logger.log("IPC: update:download");
    await downloadUpdate();
  });

  ipcMain.handle("update:install", () => {
    logger.log("IPC: update:install");
    installUpdate();
  });

  ipcMain.handle("update:get-status", async () => {
    logger.log("IPC: update:get-status");
    return getUpdateStatus();
  });

  ipcMain.handle("update:get-version", () => {
    logger.log("IPC: update:get-version");
    return getCurrentVersion();
  });

  // --- Logs ---
  ipcMain.handle("logs:get", async () => {
    logger.log("IPC: logs:get");
    return getLogs();
  });

  // --- App ---
  ipcMain.handle("app:isDev", () => {
    return is.dev;
  });

  logger.log("IPC handlers registered");
};
```

- [ ] **Step 3: Update initialization.ts**

Replace the entire file content of `src/main/initialization.ts`:

```typescript
import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend";
import { getMainWindow } from "./index";
import { weeklyBattleFetch } from "./scripts";
import { checkForUpdates, initializeUpdateService, logger } from "./utils";

export const initializeApp = (
  notifyBackendStatus: (status: string, error: string | null) => void
): void => {
  logger.log("Initializing application...");
  onStatusChange(notifyBackendStatus);

  initializeUpdateService();

  initializeBackend()
    .then(() => {
      logger.log("Application initialization completed successfully");
    })
    .catch((error) => {
      logger.error(
        `Application initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    });

  setImmediate(() => {
    checkForUpdates().catch((error) => {
      logger.error(
        `Failed to check for updates on initialization: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  });

  setImmediate(() => {
    weeklyBattleFetch().catch((error) => {
      logger.error(
        `Failed to fetch weekly battle data on launch: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  });

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      notifyBackendStatus(getConnectionStatus(), getLastError());
    });
  }
};
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Verify biome**

Run: `pnpm check`
Expected: PASS (or fix any lint issues)

- [ ] **Step 6: Commit**

```bash
git add src/main/scripts/index.ts src/main/handlers.ts src/main/initialization.ts
git commit -m "refactor(handlers): wire script registry, remove manual handler entries"
```

---

### Task 7: Update Preload to Generic Script API

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Update preload/index.ts**

Replace the `script` section of the `api` object in `src/preload/index.ts`. Keep all other sections (`window`, `backend`, `app`, `update`, `logs`) unchanged for now. Replace the `script` property:

In `src/preload/index.ts`, replace the entire `script` property (from `script: {` to the matching `},`) with:

```typescript
  script: {
    run: (id: string, ...args: unknown[]) => {
      return ipcRenderer.invoke(`script:${id}`, ...args);
    },
    cancel: () => {
      return ipcRenderer.invoke("script:cancel");
    },
    // Legacy: weekly battle data ops (will move to state.* in Phase 2)
    world2: {
      weeklyBattle: {
        fetch: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.fetch");
        },
        get: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.get");
        },
        onChange: (callback: (data: unknown) => void) => {
          const handler = (_event: IpcRendererEvent, data: unknown) => {
            callback(data);
          };
          ipcRenderer.on("weekly-battle-data-changed", handler);
          return () => {
            ipcRenderer.off("weekly-battle-data-changed", handler);
          };
        },
      },
    },
    // Legacy: construction solver (not a defineScript, stays as specific handler)
    world3: {
      construction: {
        solver: (
          inventory: unknown,
          weights: { buildRate: number; exp: number; flaggy: number },
          solveTime?: number
        ) => {
          return ipcRenderer.invoke(
            "script:world-3.construction.solver",
            inventory,
            weights,
            solveTime
          );
        },
      },
    },
    // Legacy: status change listener (will move to state.* in Phase 2)
    onStatusChange: (callback: (status: { isWorking: boolean }) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { isWorking: boolean }
      ) => {
        callback(status);
      };
      ipcRenderer.on("script-status-changed", handler);
      return () => {
        ipcRenderer.off("script-status-changed", handler);
      };
    },
  },
```

- [ ] **Step 2: Update preload/index.d.ts**

Replace the `script` section of the `Window.api` interface in `src/preload/index.d.ts`. Keep all other sections unchanged. Replace the `script` property:

```typescript
    script: {
      run: <T extends keyof ScriptMap>(
        id: T,
        ...args: ScriptMap[T]["args"]
      ) => Promise<ScriptMap[T]["result"]>;
      cancel: () => Promise<void>;
      // Legacy: weekly battle data ops (will move to state.* in Phase 2)
      world2: {
        weeklyBattle: {
          fetch: () => Promise<WeeklyBattleData>;
          get: () => Promise<WeeklyBattleData | null>;
          onChange: (
            callback: (data: WeeklyBattleData | null) => void
          ) => () => void;
        };
      };
      // Legacy: construction solver
      world3: {
        construction: {
          solver: (
            inventory: ParsedConstructionData,
            weights: SolverWeights,
            solveTime?: number
          ) => Promise<{
            score: Score;
            steps: OptimalStep[];
          } | null>;
        };
      };
      // Legacy: status change listener (will move to state.* in Phase 2)
      onStatusChange: (
        callback: (status: { isWorking: boolean }) => void
      ) => () => void;
    };
```

Add the `ScriptMap` import at the top of `src/preload/index.d.ts`:

```typescript
import type { ScriptMap } from "../types/scripts";
```

- [ ] **Step 3: Update renderer pages to use `window.api.script.run()`**

Now update all renderer page components to use the new generic `script.run()` API instead of the old nested methods.

**`src/renderer/src/app/pages/world-6/farming.tsx`** — replace `window.api.script.world6.farming.start()` with `window.api.script.run("world6.farming.start")` and `window.api.script.world6.farming.lockUnlock()` with `window.api.script.run("world6.farming.lockUnlock")`.

**`src/renderer/src/app/pages/world-6/summoning.tsx`** — replace `window.api.script.world6.summoning.startEndlessAutobattler()` with `window.api.script.run("world6.summoning.startEndlessAutobattler")` and `window.api.script.world6.summoning.startAutobattler()` with `window.api.script.run("world6.summoning.startAutobattler")`.

**`src/renderer/src/app/pages/world-2/weekly-battle.tsx`** — replace `window.api.script.world2.weeklyBattle.run(steps)` with `window.api.script.run("world2.weeklyBattle.run", steps)`. Keep `fetch`, `get`, and `onChange` calls as-is (they're legacy data ops, not scripts).

**`src/renderer/src/app/pages/world-3/construction.tsx`** — replace `window.api.script.world3.construction.apply(steps)` with `window.api.script.run("world3.construction.apply", steps)`, `window.api.script.world3.construction.collectCogs()` with `window.api.script.run("world3.construction.collectCogs")`, `window.api.script.world3.construction.trashCogs()` with `window.api.script.run("world3.construction.trashCogs")`. Keep solver call as `window.api.script.world3.construction.solver(...)`.

**`src/renderer/src/app/pages/general/store-items.tsx`** — replace `window.api.script.general.storeItems.run()` with `window.api.script.run("general.storeItems.run")`.

**`src/renderer/src/app/pages/general/test.tsx`** — replace `window.api.script.general.test.run()` with `window.api.script.run("general.test.run")`.

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Verify biome**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 6: Verify dev build runs**

Run: `pnpm dev`
Expected: App launches and functions normally. Test one script (e.g., navigate to Farming page, click a button).

- [ ] **Step 7: Commit**

```bash
git add src/preload/ src/renderer/
git commit -m "refactor(preload): generic script.run() API, update all renderer pages"
```

---

## Phase 2-7: Remaining Phases

The remaining phases (StateHub, ScriptPage, Lazy Loading, Convert Pages, Rename, Cleanup) follow the same pattern. Due to the size of this plan, they are outlined as tasks with descriptions. The implementing agent should read the full spec at `docs/superpowers/specs/2026-03-31-architecture-refactor-design.md` for detailed code patterns.

### Task 8: Create StateHub

**Files:**
- Create: `src/main/state-hub.ts`

Create the central state store following the spec Section 3. It should:
- Hold `AppState` with `scriptStatus`, `backendStatus`, `weeklyBattle` keys
- Expose `setState(key, value)` that updates state AND sends `state:<key>` IPC event to renderer
- Expose `getState(key)` for initial loads
- Register `ipcMain.handle("state:get", ...)` handler

### Task 9: Wire StateHub into Existing Systems

**Files:**
- Modify: `src/main/handlers.ts` — add `state:get` handler
- Modify: `src/main/initialization.ts` — use `setState("backendStatus", ...)` instead of raw IPC
- Modify: `src/main/utils/cancellation-token.ts` — use `setState("scriptStatus", ...)` instead of `webContents.send("script-status-changed", ...)`
- Modify: `src/main/scripts/world2/weekly-battle.ts` — use `setState("weeklyBattle", ...)` instead of `notifyChange()`

### Task 10: Add State Bridge to Preload

**Files:**
- Modify: `src/preload/index.ts` — add `state.get()` and `state.subscribe()` methods
- Modify: `src/preload/index.d.ts` — add typed `state` property using `AppState`

### Task 11: Create useMainState Hook

**Files:**
- Create: `src/renderer/src/hooks/use-main-state.ts`

```typescript
import { useEffect, useState } from "react";
import type { AppState } from "@/types/scripts";

export function useMainState<K extends keyof AppState>(key: K): AppState[K] | null {
  const [value, setValue] = useState<AppState[K] | null>(null);

  useEffect(() => {
    window.api.state.get(key).then(setValue);
    return window.api.state.subscribe(key, setValue);
  }, [key]);

  return value;
}
```

### Task 12: Remove Old Renderer Stores

**Files:**
- Delete: `src/renderer/src/store/script-status.ts`
- Delete: `src/renderer/src/store/game-data.ts`
- Simplify: `src/renderer/src/providers/game-data-provider.tsx` — keep only construction parsing (reads rawJson, writes to local state or context)
- Modify: all pages — replace `useScriptStatusStore` with `useMainState("scriptStatus")`
- Modify: `src/renderer/src/app/app.tsx` — remove `useScriptStatusStore` usage, script status now comes from StateHub
- Modify: sidebar `backend-status.tsx` — use `useMainState("backendStatus")` instead of `window.api.backend.onStatusChange`
- Remove legacy `script.onStatusChange` from preload

### Task 13: Create ScriptPage Component

**Files:**
- Create: `src/renderer/src/components/script-page.tsx`

Build the `ScriptPage` component following spec Section 4. It should:
- Accept `title`, `actions: ScriptAction[]`, and optional `children`
- Use `useMainState("scriptStatus")` for status
- Handle start/stop/cancel per action
- Display errors with consistent styling
- Render `Card > CardHeader > CardTitle > CardContent > children > action buttons`

### Task 14: Convert Simple Pages to ScriptPage

**Files:**
- Modify: `src/renderer/src/app/pages/world-6/farming.tsx`
- Modify: `src/renderer/src/app/pages/world-6/summoning.tsx`
- Modify: `src/renderer/src/app/pages/general/store-items.tsx`
- Modify: `src/renderer/src/app/pages/general/test.tsx`

Each becomes a thin wrapper around `<ScriptPage>`. Example farming.tsx:

```tsx
import { ScriptPage } from "@/components/script-page";

export default function Farming() {
  return (
    <ScriptPage
      title="Farming"
      actions={[
        { label: "Start Farming", scriptId: "world6.farming.start" },
        { label: "Lock/Unlock Crops", scriptId: "world6.farming.lockUnlock" },
      ]}
    />
  );
}
```

### Task 15: Convert Complex Pages

**Files:**
- Modify: `src/renderer/src/app/pages/world-3/construction.tsx` — use `ScriptPage` with `children` for solver UI
- Modify: `src/renderer/src/app/pages/world-2/weekly-battle.tsx` — use `useMainState("weeklyBattle")` for data, `ScriptPage` for run buttons

### Task 16: Create Page Registry + Nav Config

**Files:**
- Create: `src/renderer/src/app/page-registry.ts`
- Create: `src/renderer/src/app/nav-config.ts`
- Modify: `src/renderer/src/store/navigation.ts` — derive `NavigationPage` from `pageRegistry`

Follow spec Section 6. `pageRegistry` is a const object mapping page keys to lazy import functions. `NavigationPage` type is derived as `keyof typeof pageRegistry`.

### Task 17: Lazy Loading in App.tsx

**Files:**
- Modify: `src/renderer/src/app/app.tsx`

Replace the hidden-div `Object.entries(pageMap).map(...)` pattern with `React.lazy` + `Suspense`. Only mount the active page.

### Task 18: Update Sidebar to Use Nav Config

**Files:**
- Modify: `src/renderer/src/app/sidebar/app-sidebar.tsx`

Import and render from `navConfig` instead of the inline `getNavItems()` function.

### Task 19: Convert All Pages to Default Exports

**Files:**
- Modify: `src/renderer/src/app/pages/dashboard.tsx`
- Modify: `src/renderer/src/app/pages/raw-data.tsx`
- Modify: `src/renderer/src/app/pages/general/logs.tsx`
- All other pages already converted in Tasks 14-15

Change named exports to default exports for `React.lazy` compatibility.

### Task 20: Rename navigation/ to game-nav/

**Files:**
- Rename: `src/main/scripts/navigation/` → `src/main/scripts/game-nav/`
- Modify: all files that import from `../navigation` → `../game-nav`

Affected imports in: `construction-apply.ts`, `collect-cogs.ts`, `trash-cogs.ts`, `test.ts`, `store-items.ts`, `scripts/index.ts`

### Task 21: Final Cleanup

**Files:**
- Remove legacy preload methods (old `script.world6.*`, `script.general.*` etc. if not already removed)
- Remove legacy IPC events (`script-status-changed`, `weekly-battle-data-changed`, `backend-status-changed`) — replaced by `state:*` events
- Remove unused imports across all files
- Run `pnpm typecheck && pnpm check` and fix any issues
- Verify `pnpm dev` runs correctly
- Test all scripts from the UI

### Task 22: Verification

- [ ] Run `pnpm typecheck` — expect 0 errors
- [ ] Run `pnpm check` — expect 0 issues
- [ ] Run `pnpm build` — expect successful build
- [ ] Run `pnpm dev` — verify app launches
- [ ] Navigate to each page — verify they load correctly
- [ ] Test farming start/stop — verify script execution
- [ ] Verify weekly battle data loads on startup
- [ ] Verify backend status shows in sidebar
- [ ] Commit final state

```bash
git add -A
git commit -m "refactor(architecture): complete architecture refactor"
```
