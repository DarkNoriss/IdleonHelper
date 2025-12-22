import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend-client"
import { getMainWindow } from "./index"
import { scripts } from "./scripts"

export const initializeApp = (
  notifyBackendStatus: (status: string, error: string | null) => void
): void => {
  onStatusChange(notifyBackendStatus)

  initializeBackend().catch(() => {})

  scripts.world2.weeklyBattle.fetch().catch((error) => {
    console.error("Failed to fetch weekly battle data on launch:", error)
  })

  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      notifyBackendStatus(getConnectionStatus(), getLastError())
    })
  }
}
