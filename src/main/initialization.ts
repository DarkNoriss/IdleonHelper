import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend"
import { getMainWindow } from "./index"
import { logger } from "./utils"

// import { scripts } from "./scripts"

export const initializeApp = (
  notifyBackendStatus: (status: string, error: string | null) => void
): void => {
  logger.log("Initializing application...")
  onStatusChange(notifyBackendStatus)

  initializeBackend()
    .then(() => {
      logger.log("Application initialization completed successfully")
    })
    .catch((error) => {
      logger.error(
        `Application initialization failed: ${error instanceof Error ? error.message : String(error)}`
      )
    })

  // scripts.world2.weeklyBattle.fetch().catch((error) => {
  //   logger.error("Failed to fetch weekly battle data on launch:", error)
  // })

  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      notifyBackendStatus(getConnectionStatus(), getLastError())
    })
  }
}
