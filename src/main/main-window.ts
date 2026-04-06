import type { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export const getMainWindow = (): BrowserWindow | null => {
  return mainWindow;
};

export const setMainWindow = (window: BrowserWindow | null): void => {
  mainWindow = window;
};
