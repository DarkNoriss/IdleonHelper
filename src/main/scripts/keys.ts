import { backendCommand } from "../backend/index";
import type { CancellationToken } from "../utils/cancellation-token";
import { delay } from "../utils/index";

export const Key = {
  ESCAPE: 0x1b,
  ENTER: 0x0d,
  SPACE: 0x20,
  TAB: 0x09,
} as const;

export type KeyName = keyof typeof Key;

const CLOSE_MENU_SETTLE_MS = 250;

export const pressKey = (
  key: KeyName,
  token: CancellationToken
): Promise<{ success: boolean }> => {
  return backendCommand.keyPress(Key[key], undefined, token);
};

// Press ESCAPE then wait for the menu close animation to settle. Use this
// at the end of any flow that returns control to the world view, so the
// next script's screen-grab is not racing the closing animation.
export const closeMenu = async (token: CancellationToken): Promise<void> => {
  await pressKey("ESCAPE", token);
  await delay(CLOSE_MENU_SETTLE_MS, token);
};
