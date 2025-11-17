import { ipcMain } from "electron"

import { captureWindowToFile } from "../utils/screenshot"
import { findWindow, hwndToString } from "../utils/window"

export const registerGameWindowHandlers = (): void => {
  ipcMain.handle("gameWindow:find", () => {
    const hwnd = findWindow()

    if (!hwnd) {
      return { success: false }
    }

    // Stringify HWND only for IPC response
    return { success: true, hwnd: hwndToString(hwnd) }
  })

  ipcMain.handle("gameWindow:screenshot", async () => {
    const hwnd = findWindow()
    if (!hwnd) {
      return { success: false, message: "Window not found" }
    }

    const filepath = "D:/screenshot.bmp"
    const success = await captureWindowToFile(hwnd, filepath)

    if (!success) {
      return { success: false, message: "Failed to capture screenshot" }
    }

    return { success: true }
  })
}
