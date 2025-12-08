import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { join } from "path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell } from "electron"
import { autoUpdater } from "electron-updater"

let backendProcess: ChildProcessWithoutNullStreams | null = null
let mainWindow: BrowserWindow | null = null

// Configure auto-updater
autoUpdater.autoDownload = false // User-initiated updates only
autoUpdater.autoInstallOnAppQuit = true // Auto-install on quit after download
// autoUpdater.channel = "beta" // Uncomment to check for pre-releases
// autoUpdater.allowPrerelease = true // Uncomment to allow pre-releases

const getBackendPath = (): string => {
  if (is.dev) {
    return join(
      process.cwd(),
      "resources",
      "backend",
      "IdleonHelperBackend.exe"
    )
  } else {
    return join(process.resourcesPath, "backend", "IdleonHelperBackend.exe")
  }
}

const startBackend = (): void => {
  if (process.platform !== "win32") {
    // Skip if not Windows
    return
  }

  const exePath = getBackendPath()
  if (!exePath) {
    throw new Error("Backend executable path not found")
  }

  console.log("Starting backend...")

  backendProcess = spawn(exePath, [], {
    stdio: "pipe",
    detached: false,
  })

  // Forward stdout to console
  backendProcess.stdout?.on("data", (data) => {
    console.log(`[Backend] ${data.toString()}`)
  })

  // Forward stderr to console
  backendProcess.stderr?.on("data", (data) => {
    console.error(`[Backend Error] ${data.toString()}`)
  })

  backendProcess.on("exit", (code, signal) => {
    console.log(`Backend process exited with code ${code} and signal ${signal}`)
    backendProcess = null
  })

  backendProcess.on("error", (error) => {
    console.error("Backend process error:", error)
    backendProcess = null
  })
}

const createWindow = (): void => {
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

// Set the app name for Task Manager and system display
app.setName("IdleonHelper")

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron.idleonhelper")

  // Start the backend
  startBackend()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on("ping", () => console.log("pong"))

  // Window controls
  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  // Update handlers
  ipcMain.handle("app:get-version", () => {
    return app.getVersion()
  })

  ipcMain.handle("updater:check-for-updates", async () => {
    if (is.dev) {
      // Skip update check in development
      return { available: false, currentVersion: app.getVersion() }
    }
    try {
      console.log("[Updater] Checking for updates...")
      console.log("[Updater] Current version:", app.getVersion())
      console.log("[Updater] Feed URL:", autoUpdater.getFeedURL())
      const result = await autoUpdater.checkForUpdates()
      console.log("[Updater] Check result:", {
        updateInfo: result?.updateInfo,
        version: result?.updateInfo?.version,
        hasUpdate: !!result?.updateInfo,
      })
      return {
        available: result?.updateInfo ? true : false,
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version,
      }
    } catch (error) {
      console.error("[Updater] Update check failed:", error)
      return {
        available: false,
        currentVersion: app.getVersion(),
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  ipcMain.handle("updater:download-update", async () => {
    if (is.dev) {
      return { success: false, error: "Updates not available in development" }
    }
    try {
      console.log("[Updater] Starting download...")
      await autoUpdater.downloadUpdate()
      console.log("[Updater] Download initiated")
      return { success: true }
    } catch (error) {
      console.error("[Updater] Update download failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  ipcMain.handle("updater:quit-and-install", () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Auto-updater event handlers
  autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("updater:checking-for-update")
  })

  autoUpdater.on("update-available", (info) => {
    console.log("[Updater Event] update-available:", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseName: info.releaseName,
    })
    mainWindow?.webContents.send("updater:update-available", {
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on("update-not-available", () => {
    mainWindow?.webContents.send("updater:update-not-available")
  })

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow?.webContents.send("updater:update-downloaded", {
      version: info.version,
    })
  })

  autoUpdater.on("error", (error) => {
    console.error("[Updater Event] error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    mainWindow?.webContents.send("updater:error", {
      message: error.message,
    })
  })

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  // Check for updates on startup (only in production)
  if (!is.dev) {
    // Delay initial check slightly to let UI load
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        console.error("Initial update check failed:", error)
      })
    }, 2000)
  }

  // World handlers
  import("./worlds/world-3/construction").then((module) => {
    module.registerWorld3ConstructionHandlers()
  })

  createWindow()

  app.on("activate", () => {
    // Re-create a window when the app icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed
app.on("window-all-closed", () => {
  app.quit()
})

// Kill the backend process when the app is closed
app.on("before-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
