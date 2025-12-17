import { join } from "path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell } from "electron"

import { startBackend, stopBackend } from "./backend-process"

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
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

  // Start backend asynchronously (non-blocking)
  startBackend().catch((error) => {
    console.error(
      "Backend error:",
      error instanceof Error ? error.message : String(error)
    )
  })

  // Create window immediately (doesn't wait for backend)
  createWindow()

  // Window controls
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })
})

// Quit when all windows are closed
app.on("window-all-closed", () => {
  stopBackend()
  app.quit()
})

// Cleanup on app quit
app.on("before-quit", () => {
  stopBackend()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
