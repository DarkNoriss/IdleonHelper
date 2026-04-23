import { globalShortcut } from "electron";
import { queueEngine } from "../queue/index";
import { logger } from "../utils/index";

const HOTKEY = "Control+Escape";

export type PanicResult = {
  cancelledItemIds: string[];
};

export const panicExit = (): PanicResult => {
  const snapshot = queueEngine.get();
  const cancelledItemIds = [
    ...(snapshot.runningItem ? [snapshot.runningItem.itemId] : []),
    ...snapshot.queue.filter((i) => i.status === "queued").map((i) => i.itemId),
  ];
  queueEngine.pause();
  queueEngine.clear();
  logger.log(
    `dev: panic triggered - cancelled ${cancelledItemIds.length} item(s)`
  );
  return { cancelledItemIds };
};

export const registerPanicHotkey = (): void => {
  const ok = globalShortcut.register(HOTKEY, () => {
    panicExit();
  });
  if (ok) {
    logger.log(`dev: ${HOTKEY} panic hotkey armed`);
  } else {
    logger.warn(`dev: failed to register ${HOTKEY} panic hotkey`);
  }
};

export const unregisterPanicHotkey = (): void => {
  globalShortcut.unregister(HOTKEY);
};
