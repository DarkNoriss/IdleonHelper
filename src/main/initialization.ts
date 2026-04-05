import type { ConnectionStatus } from "../types/scripts.ts";
import {
  getConnectionStatus,
  getLastError,
  initializeBackend,
  onStatusChange,
} from "./backend/index.ts";
import { getMainWindow } from "./main-window.ts";
import { weeklyBattleFetch } from "./scripts/index.ts";
import { setState } from "./state-hub.ts";
import {
  checkForUpdates,
  initializeUpdateService,
  logger,
} from "./utils/index.ts";

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
