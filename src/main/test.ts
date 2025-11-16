import { ipcMain } from "electron"

import { findWindow } from "./utils/window"

export function registerTestHandlers(): void {
  ipcMain.handle("test:run", () => {
    const hwnd = findWindow()

    if (!hwnd) {
      return { success: false }
    }

    return { success: true, hwnd }
  })
}
