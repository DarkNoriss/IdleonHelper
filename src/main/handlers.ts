import { is } from "@electron-toolkit/utils"
import { BrowserWindow, ipcMain } from "electron"

import { getConnectionStatus, getLastError } from "./backend"
import { backendCommand } from "./backend/backend-command"
import { scripts } from "./scripts"
import {
  cancellationManager,
  checkForUpdates,
  downloadUpdate,
  getCurrentVersion,
  getLogs,
  getUpdateStatus,
  installUpdate,
  logger,
} from "./utils"

export const setupHandlers = (): void => {
  logger.log("Setting up IPC handlers")

  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
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

  ipcMain.handle(
    "script:world-6.summoning.start-endless-autobattler",
    async () => {
      logger.log("IPC: script:world-6.summoning.start-endless-autobattler")
      return await scripts.world6.summoning.startEndlessAutobattler()
    }
  )

  ipcMain.handle("script:world-6.summoning.start-autobattler", async () => {
    logger.log("IPC: script:world-6.summoning.start-autobattler")
    return await scripts.world6.summoning.startAutobattler()
  })

  ipcMain.handle("script:get-status", async () => {
    logger.log("IPC: script:get-status")
    return cancellationManager.getStatus()
  })

  ipcMain.handle("script:cancel", async () => {
    logger.log("IPC: script:cancel")
    cancellationManager.cancelCurrent()
    try {
      await backendCommand.stop()
    } catch (error) {
      logger.error(
        `Failed to send stop command to backend: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  ipcMain.handle("backend:getStatus", async () => {
    logger.log("IPC: backend:getStatus")
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    }
  })

  ipcMain.handle("update:check", async () => {
    logger.log("IPC: update:check")
    await checkForUpdates()
  })

  ipcMain.handle("update:download", async () => {
    logger.log("IPC: update:download")
    await downloadUpdate()
  })

  ipcMain.handle("update:install", () => {
    logger.log("IPC: update:install")
    installUpdate()
  })

  ipcMain.handle("update:get-status", async () => {
    logger.log("IPC: update:get-status")
    return getUpdateStatus()
  })

  ipcMain.handle("update:get-version", () => {
    logger.log("IPC: update:get-version")
    return getCurrentVersion()
  })

  ipcMain.handle("logs:get", async () => {
    logger.log("IPC: logs:get")
    return getLogs()
  })

  ipcMain.handle("script:general.test.run", async () => {
    logger.log("IPC: script:general.test.run")
    return await scripts.general.test.run()
  })

  ipcMain.handle("script:world-3.construction.solver", async () => {
    logger.log("IPC: script:world-3.construction.solver")
    return await scripts.world3.construction.solver()
  })

  ipcMain.handle("script:world-3.construction.apply", async () => {
    logger.log("IPC: script:world-3.construction.apply")
    return await scripts.world3.construction.apply()
  })

  ipcMain.handle("app:isDev", () => {
    return is.dev
  })

  logger.log("IPC handlers registered")
}
