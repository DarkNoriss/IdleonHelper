import { is } from "@electron-toolkit/utils";
import { BrowserWindow, ipcMain } from "electron";

import type {
  ParsedConstructionData,
  SolverWeights,
} from "../types/construction";
import { registerAuthHandlers } from "./auth/auth-ipc";
import { getConnectionStatus, getLastError } from "./backend/index";
import {
  allScripts,
  cancelSolver,
  solve,
  weeklyBattleFetch,
  weeklyBattleGet,
} from "./scripts/index";
import { registerAllScripts } from "./scripts/registry";
import { getState, registerStateHandlers, setState } from "./state-hub";
import {
  checkForUpdates,
  downloadUpdate,
  getCurrentVersion,
  getLogs,
  getUpdateStatus,
  installUpdate,
  logger,
} from "./utils/index";

export const setupHandlers = (): void => {
  logger.log("Setting up IPC handlers");

  // Register all script handlers automatically
  registerAllScripts(allScripts);
  registerStateHandlers();
  registerAuthHandlers();

  // Window
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.close();
    }
  });

  ipcMain.on("window-minimize", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.on("window-maximize", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return;
    }
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  // Weekly battle data (not scripts — data operations)
  ipcMain.handle("script:world-2.weekly-battle.fetch", async () => {
    logger.log("IPC: script:world-2.weekly-battle.fetch");
    return await weeklyBattleFetch();
  });

  ipcMain.handle("script:world-2.weekly-battle.get", async () => {
    logger.log("IPC: script:world-2.weekly-battle.get");
    return await weeklyBattleGet();
  });

  // Construction solver (concurrent, not a defineScript)
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
      return await solve(inventory, weights, solveTime ?? 1000);
    }
  );

  ipcMain.handle("script:world-3.construction.solver.cancel", () => {
    logger.log("IPC: script:world-3.construction.solver.cancel");
    cancelSolver();
  });

  // Backend
  ipcMain.handle("backend:getStatus", async () => {
    logger.log("IPC: backend:getStatus");
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    };
  });

  // Updates
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

  // Logs
  ipcMain.handle("logs:get", async () => {
    logger.log("IPC: logs:get");
    return getLogs();
  });

  // Script configs
  ipcMain.handle(
    "scriptConfigs:publish",
    (_event, scriptId: string, args: unknown[]) => {
      const current = getState("scriptConfigs");
      setState("scriptConfigs", { ...current, [scriptId]: args });
    }
  );

  // App
  ipcMain.handle("app:isDev", () => {
    return is.dev;
  });

  logger.log("IPC handlers registered");
};
