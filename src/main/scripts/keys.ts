import { backendCommand } from "../backend/index";
import type { CancellationToken } from "../utils/cancellation-token";

export const Key = {
  ESCAPE: 0x1b,
  ENTER: 0x0d,
  SPACE: 0x20,
  TAB: 0x09,
} as const;

export type KeyName = keyof typeof Key;

export const pressKey = (
  key: KeyName,
  token: CancellationToken
): Promise<{ success: boolean }> => {
  return backendCommand.keyPress(Key[key], undefined, token);
};
