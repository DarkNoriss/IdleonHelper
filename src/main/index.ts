import { join } from "path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell } from "electron"

import {
  closeConnection,
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend-client"
import { stopBackend } from "./backend-process"
import { scripts } from "./scripts"

let mainWindow: BrowserWindow | null = null

function notifyBackendStatus(status: string, error: string | null): void {
  if (!mainWindow) return

  mainWindow.webContents.send("backend-status-changed", {
    status,
    error,
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 958,
    height: 570,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: true,
    },
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
    scripts["world-2"].weeklyBattle.setMainWindow(null)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.electron")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register status callback BEFORE initializing backend to avoid race condition
  // This ensures we capture all status changes, including the initial "connected" status
  onStatusChange(notifyBackendStatus)

  // Initialize backend and WebSocket connection asynchronously (non-blocking)
  initializeBackend().catch(() => {
    // Errors are handled via status change callbacks
  })

  createWindow()

  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  scripts["world-2"].weeklyBattle.setMainWindow(mainWindow)

  ipcMain.handle("script:navigation.ui.toCodex", async () => {
    return await scripts.navigation.ui.toCodex()
  })

  ipcMain.handle("script:navigation.ui.toItems", async () => {
    return await scripts.navigation.ui.toItems()
  })

  ipcMain.handle("script:world-2.weekly-battle.fetch", async () => {
    return await scripts["world-2"].weeklyBattle.fetch()
  })

  ipcMain.handle("script:world-2.weekly-battle.get", async () => {
    return await scripts["world-2"].weeklyBattle.get()
  })

  // Handler for frontend to request current backend status
  ipcMain.handle("backend:getStatus", async () => {
    return {
      status: getConnectionStatus(),
      error: getLastError(),
    }
  })

  scripts["world-2"].weeklyBattle.fetch().catch((error) => {
    console.error("Failed to fetch weekly battle data on launch:", error)
  })

  // When window is ready, send current status to ensure frontend receives it
  // The callback is already registered above, but we need to ensure IPC is ready
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      // Send current status to ensure frontend receives it (callback already registered)
      // This handles the case where connection completed before window was ready
      notifyBackendStatus(getConnectionStatus(), getLastError())
    })
  }
})

app.on("window-all-closed", () => {
  closeConnection()
  stopBackend()
  app.quit()
})

app.on("before-quit", () => {
  closeConnection()
  stopBackend()
})
