import { ipcMain } from "electron"

import { findWindow } from "./utils/window"

export function registerTestHandlers(): void {
  ipcMain.handle("gamewindow:find", () => {
    const hwnd = findWindow()

    if (!hwnd) {
      return { success: false }
    }

    return { success: true, hwnd }
  })

  ipcMain.handle("gamewindow:screenshot", () => {
    console.log("screenshot")
  })
}
