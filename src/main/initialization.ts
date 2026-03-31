import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend";
import { getMainWindow } from "./index";
import { weeklyBattleFetch } from "./scripts";
import { checkForUpdates, initializeUpdateService, logger } from "./utils";

export const initializeApp = (
  notifyBackendStatus: (status: string, error: string | null) => void
): void => {
  logger.log("Initializing application...");
  onStatusChange(notifyBackendStatus);

  initializeUpdateService();

  initializeBackend()
    .then(() => {
      logger.log("Application initialization completed successfully");
    })
    .catch((error) => {
      logger.error(
        `Application initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    });

  setImmediate(() => {
    checkForUpdates().catch((error) => {
      logger.error(
        `Failed to check for updates on initialization: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  });

  setImmediate(() => {
    weeklyBattleFetch().catch((error) => {
      logger.error(
        `Failed to fetch weekly battle data on launch: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  });

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.once("dom-ready", () => {
      notifyBackendStatus(getConnectionStatus(), getLastError());
    });
  }
};
