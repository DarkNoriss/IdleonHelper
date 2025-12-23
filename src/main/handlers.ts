import { BrowserWindow, ipcMain } from "electron"

import { getConnectionStatus, getLastError } from "./backend-client"
import { cancellationManager } from "./cancellation-token"
import { logger } from "./logger"
import { scripts } from "./scripts"

export const setupHandlers = (): void => {
  logger.log("Setting up IPC handlers")

  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  ipcMain.handle("script:navigation.ui.toCodex", async () => {
    logger.log("IPC: script:navigation.ui.toCodex")
    return await scripts.navigation.ui.toCodex()
  })

  ipcMain.handle("script:navigation.ui.toItems", async () => {
    logger.log("IPC: script:navigation.ui.toItems")
    return await scripts.navigation.ui.toItems()
  })

  ipcMain.handle("script:world-2.weekly-battle.fetch", async () => {
    logger.log("IPC: script:world-2.weekly-battle.fetch")
    return await scripts.world2.weeklyBattle.fetch()
  })

  ipcMain.handle("script:world-2.weekly-battle.get", async () => {
    logger.log("IPC: script:world-2.weekly-battle.get")
    return await scripts.world2.weeklyBattle.get()
  })

  ipcMain.handle(
    "script:world-2.weekly-battle.run",
    async (_event, steps: number[]) => {
      logger.log(
        `IPC: script:world-2.weekly-battle.run (steps: ${steps.length})`
      )
      return await scripts.world2.weeklyBattle.run(steps)
    }
  )

  ipcMain.handle("script:get-status", async () => {
    logger.log("IPC: script:get-status")
    return cancellationManager.getStatus()
  })

  ipcMain.handle("script:cancel", async () => {
    logger.log("IPC: script:cancel")
    cancellationManager.cancelCurrent()
  })

  ipcMain.handle("backend:getStatus", async () => {
    logger.log("IPC: backend:getStatus")
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    }
  })

  logger.log("IPC handlers registered")
}
