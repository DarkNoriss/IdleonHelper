import { BrowserWindow, ipcMain } from "electron"

import { getConnectionStatus, getLastError } from "./backend-client"
import { scripts } from "./scripts"

export const setupHandlers = (): void => {
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  ipcMain.handle("script:navigation.ui.toCodex", async () => {
    return await scripts.navigation.ui.toCodex()
  })

  ipcMain.handle("script:navigation.ui.toItems", async () => {
    return await scripts.navigation.ui.toItems()
  })

  ipcMain.handle("script:world-2.weekly-battle.fetch", async () => {
    return await scripts.world2.weeklyBattle.fetch()
  })

  ipcMain.handle("script:world-2.weekly-battle.get", async () => {
    return await scripts.world2.weeklyBattle.get()
  })

  ipcMain.handle(
    "script:world-2.weekly-battle.run",
    async (_event, steps: number[]) => {
      return await scripts.world2.weeklyBattle.run(steps)
    }
  )

  ipcMain.handle("backend:getStatus", async () => {
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    }
  })
}
