import type { ConnectionStatus } from "../types/scripts";
import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend/index";
import { getMainWindow } from "./main-window";
import { weeklyBattleFetch } from "./scripts/index";
import { setState } from "./state-hub";
import {
  checkForUpdates,
  initializeUpdateService,
  logger,
} from "./utils/index";

export const initializeApp = (): void => {
  logger.log("Initializing application...");
  onStatusChange((status, error) =>
    setState("backendStatus", {
      status: status as ConnectionStatus,
      error,
    })
  );

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
      setState("backendStatus", {
        status: getConnectionStatus() as ConnectionStatus,
        error: getLastError(),
      });
    });
  }
};
