import { app } from "electron"
import { autoUpdater } from "electron-updater"

import { getMainWindow } from "../index"
import { logger } from "./logger"

export type UpdateStatus =
  | "idle"
  | "checking"
  | "update-available"
  | "update-not-available"
  | "downloading"
  | "update-downloaded"
  | "installing"
  | "error"

type UpdateInfo = {
  version: string
  status: UpdateStatus
  error?: string
}

let currentStatus: UpdateStatus = "idle"
let updateInfo: UpdateInfo | null = null
let errorMessage: string | null = null

const notifyRenderer = (
  status: UpdateStatus,
  version?: string,
  error?: string
): void => {
  const window = getMainWindow()
  if (!window) return

  const payload: UpdateInfo = {
    version: version || app.getVersion(),
    status,
    ...(error && { error }),
  }

  updateInfo = payload
  currentStatus = status
  errorMessage = error || null

  window.webContents.send("update-status-changed", payload)
}

export const initializeUpdateService = (): void => {
  logger.log("Initializing update service")

  // Configure autoUpdater
  autoUpdater.autoDownload = false // Don't auto-download, let user decide
  autoUpdater.autoInstallOnAppQuit = true // Auto-install on quit if downloaded

  // Event handlers
  autoUpdater.on("checking-for-update", () => {
    logger.log("Checking for updates...")
    notifyRenderer("checking")
  })

  autoUpdater.on("update-available", (info) => {
    logger.log(`Update available: ${info.version}`)
    notifyRenderer("update-available", info.version)
  })

  autoUpdater.on("update-not-available", () => {
    logger.log("No updates available")
    notifyRenderer("update-not-available")
  })

  autoUpdater.on("error", (error) => {
    logger.error(`Update error: ${error.message}`)
    notifyRenderer("error", undefined, error.message)
  })

  autoUpdater.on("download-progress", (progressObj) => {
    logger.log(
      `Download progress: ${Math.round(progressObj.percent)}% (${progressObj.transferred}/${progressObj.total})`
    )
    const window = getMainWindow()
    if (window) {
      window.webContents.send("update-download-progress", {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
      })
    }
  })

  autoUpdater.on("update-downloaded", (info) => {
    logger.log(`Update downloaded: ${info.version}`)
    notifyRenderer("update-downloaded", info.version)
  })

  logger.log("Update service initialized")
}

export const checkForUpdates = async (): Promise<void> => {
  try {
    logger.log("Checking for updates...")
    await autoUpdater.checkForUpdates()
  } catch (error) {
    logger.error(
      `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`
    )
    notifyRenderer(
      "error",
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export const downloadUpdate = async (): Promise<void> => {
  try {
    if (currentStatus !== "update-available") {
      throw new Error("No update available to download")
    }

    logger.log("Downloading update...")
    notifyRenderer("downloading")
    await autoUpdater.downloadUpdate()
  } catch (error) {
    logger.error(
      `Failed to download update: ${error instanceof Error ? error.message : String(error)}`
    )
    notifyRenderer(
      "error",
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export const installUpdate = (): void => {
  try {
    if (currentStatus !== "update-downloaded") {
      throw new Error("No update downloaded to install")
    }

    logger.log("Preparing to install update...")
    notifyRenderer("installing")

    // quitAndInstall will trigger the app's before-quit handler
    // which will automatically stop the backend and close connections
    logger.log("Installing update silently and restarting...")
    // quitAndInstall(isSilent, isForceRunAfter)
    // isSilent: true = silent installation (no installer UI)
    // isForceRunAfter: true = automatically restart app after installation
    // Use setImmediate to make this non-blocking and prevent UI freeze
    setImmediate(() => {
      autoUpdater.quitAndInstall(true, true)
    })
  } catch (error) {
    logger.error(
      `Failed to install update: ${error instanceof Error ? error.message : String(error)}`
    )
    notifyRenderer(
      "error",
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export const getUpdateStatus = (): UpdateInfo => {
  return (
    updateInfo || {
      version: app.getVersion(),
      status: currentStatus,
      ...(errorMessage && { error: errorMessage }),
    }
  )
}

export const getCurrentVersion = (): string => {
  return app.getVersion()
}
