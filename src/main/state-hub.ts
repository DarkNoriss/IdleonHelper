import { ipcMain } from "electron";

import type { AppState } from "../types/scripts";
import { getMainWindow } from "./index";

const state: AppState = {
  scriptStatus: {
    current: null,
    isWorking: false,
  },
  backendStatus: {
    status: "connecting",
    error: null,
  },
  weeklyBattle: {
    data: null,
    fetchedAt: null,
  },
};

export function setState<K extends keyof AppState>(
  key: K,
  value: AppState[K]
): void {
  state[key] = value;
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send(`state:${key}`, value);
  }
}

export function getState<K extends keyof AppState>(key: K): AppState[K] {
  return state[key];
}

export function registerStateHandlers(): void {
  ipcMain.handle("state:get", (_event, key: string) =>
    getState(key as keyof AppState)
  );
}
