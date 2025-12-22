import { join } from "path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, shell } from "electron"

import { closeConnection } from "./backend-client"
import { stopBackend } from "./backend-process"
import { setupHandlers } from "./handlers"
import { initializeApp } from "./initialization"

let mainWindow: BrowserWindow | null = null

export const getMainWindow = (): BrowserWindow | null => {
  return mainWindow
}

export const setMainWindow = (window: BrowserWindow | null): void => {
  mainWindow = window
}

function notifyBackendStatus(status: string, error: string | null): void {
  const window = getMainWindow()
  if (!window) return

  window.webContents.send("backend-status-changed", {
    status,
    error,
  })
}

function createWindow(): void {
  const window = new BrowserWindow({
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

  setMainWindow(window)

  window.on("ready-to-show", () => {
    window?.show()
  })

  window.on("closed", () => {
    setMainWindow(null)
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.electron")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  setupHandlers()
  initializeApp(notifyBackendStatus)
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
