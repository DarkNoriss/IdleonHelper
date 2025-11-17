import { ipcMain } from "electron"

import { findWindow } from "../utils/window"

export function registerGameWindowHandlers(): void {
  ipcMain.handle("gameWindow:find", () => {
    const hwnd = findWindow()

    if (!hwnd) {
      return { success: false }
    }

    return { success: true, hwnd }
  })

  ipcMain.handle("gameWindow:screenshot", () => {
    console.log("screenshot")
  })
}
