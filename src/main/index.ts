import { join } from "path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell } from "electron"

import {
  closeConnection,
  initializeBackend,
  onStatusChange,
} from "./backend-client"
import { stopBackend } from "./backend-process"
import { scripts } from "./scripts"
import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "./weekly-battle-data"

let mainWindow: BrowserWindow | null = null
let weeklyBattleData: WeeklyBattleData | null = null

/**
 * Notifies the renderer process about backend status changes
 */
function notifyBackendStatus(status: string, error: string | null): void {
  if (!mainWindow) return

  mainWindow.webContents.send("backend-status-changed", {
    status,
    error,
  })
}

/**
 * Notifies the renderer process about weekly battle data updates
 */
function notifyWeeklyBattleData(data: WeeklyBattleData | null): void {
  if (!mainWindow) return

  mainWindow.webContents.send("weekly-battle-data-changed", data)
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 958,
    height: 570,
    show: false,
    frame: false, // Remove default title bar
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: true, // Enable DevTools for debugging (F12 or Ctrl+Shift+I)
    },
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize backend and WebSocket connection asynchronously (non-blocking)
  initializeBackend().catch(() => {
    // Errors are handled via status change callbacks
  })

  // Create window immediately (doesn't wait for backend)
  createWindow()

  // Window controls
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  // Static script handlers - fully typed for each script
  ipcMain.handle("script:navigation.ui.toCodex", async () => {
    return await scripts.navigation.ui.toCodex()
  })

  ipcMain.handle("script:navigation.ui.toItems", async () => {
    return await scripts.navigation.ui.toItems()
  })

  // Weekly battle data handlers
  ipcMain.handle("weekly-battle:get", async () => {
    return weeklyBattleData
  })

  ipcMain.handle("weekly-battle:fetch", async () => {
    try {
      weeklyBattleData = await fetchWeeklyBattleData()
      notifyWeeklyBattleData(weeklyBattleData)
      return weeklyBattleData
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to fetch weekly battle data: ${errorMessage}`)
    }
  })

  // Fetch data on app launch
  fetchWeeklyBattleData()
    .then((data) => {
      weeklyBattleData = data
      if (mainWindow) {
        notifyWeeklyBattleData(weeklyBattleData)
      }
    })
    .catch((error) => {
      console.error("Failed to fetch weekly battle data on launch:", error)
    })

  // Wait for window to be ready before subscribing to status changes
  // This ensures the renderer's IPC listener is set up before we send status updates
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      // Subscribe to backend status changes after renderer is ready
      onStatusChange(notifyBackendStatus)
      // Send initial weekly battle data (may be null if fetch is still in progress)
      notifyWeeklyBattleData(weeklyBattleData)
    })
  } else {
    // Fallback: subscribe immediately if window creation failed
    onStatusChange(notifyBackendStatus)
  }
})

// Quit when all windows are closed
app.on("window-all-closed", () => {
  closeConnection()
  stopBackend()
  app.quit()
})

// Cleanup on app quit
app.on("before-quit", () => {
  closeConnection()
  stopBackend()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
