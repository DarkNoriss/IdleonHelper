import { ipcMain } from "electron"

import { findWindow } from "../utils/window"

export const registerGameWindowHandlers = (): void => {
  ipcMain.handle("gameWindow:find", () => {
    const hwnd = findWindow()

    if (!hwnd) {
      return { success: false }
    }

    return { success: true, hwnd }
  })

  ipcMain.handle("gameWindow:screenshot", () => {
    console.log("screenshot")

    return { success: true }
  })
}
