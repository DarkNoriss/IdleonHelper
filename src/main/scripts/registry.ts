import { ipcMain } from "electron";
import type { ScriptMap } from "../../types/scripts";
import { queueEngine } from "../queue/index";
import { logger } from "../utils/index";
import type { ScriptDescriptor } from "./define-script";

let registeredScripts: ScriptDescriptor[] = [];

export const registerAllScripts = (scripts: ScriptDescriptor[]): void => {
  registeredScripts = scripts;
  queueEngine.registerScripts(scripts);

  ipcMain.handle(
    "queue:enqueue",
    (_event, scriptId: keyof ScriptMap, ...args: unknown[]) => {
      logger.log(`IPC: queue:enqueue ${String(scriptId)}`);
      return queueEngine.enqueue(scriptId, args);
    }
  );

  ipcMain.handle("queue:remove", (_event, itemId: string) => {
    logger.log(`IPC: queue:remove ${itemId}`);
    queueEngine.remove(itemId);
  });

  ipcMain.handle("queue:pause", () => {
    logger.log("IPC: queue:pause");
    queueEngine.pause();
  });

  ipcMain.handle("queue:resume", () => {
    logger.log("IPC: queue:resume");
    queueEngine.resume();
  });

  ipcMain.handle("queue:clear", () => {
    logger.log("IPC: queue:clear");
    queueEngine.clear();
  });

  ipcMain.handle("queue:get", () => queueEngine.get());

  logger.log(`Registered ${scripts.length} scripts`);
};

export const getRegisteredScripts = (): ScriptDescriptor[] => registeredScripts;
