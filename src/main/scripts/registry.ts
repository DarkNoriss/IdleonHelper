import { ipcMain } from "electron";

import { backendCommand } from "../backend";
import { cancellationManager, logger } from "../utils";
import type { ScriptDescriptor } from "./define-script";

let registeredScripts: ScriptDescriptor[] = [];

export const registerAllScripts = (scripts: ScriptDescriptor[]): void => {
  registeredScripts = scripts;

  for (const script of scripts) {
    ipcMain.handle(
      `script:${script.id}`,
      async (_event, ...args: unknown[]) => {
        logger.log(`IPC: script:${script.id}`);
        return await script.execute(...args);
      }
    );
  }

  // System-level script handlers
  ipcMain.handle("script:cancel", async () => {
    logger.log("IPC: script:cancel");
    cancellationManager.cancelCurrent();
    try {
      await backendCommand.stop();
    } catch (error) {
      logger.error(
        `Failed to send stop command to backend: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  ipcMain.handle("script:get-status", () => {
    return cancellationManager.getStatus();
  });

  logger.log(`Registered ${scripts.length} scripts`);
};

export const getRegisteredScripts = (): ScriptDescriptor[] => registeredScripts;
