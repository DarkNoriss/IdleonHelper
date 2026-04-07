import type { CancellationToken } from "../utils/cancellation-token";

export const Key = {
  ESCAPE: 0x1b,
  ENTER: 0x0d,
  SPACE: 0x20,
  TAB: 0x09,
} as const;

export type KeyName = keyof typeof Key;

type Backend = {
  keyPress: (
    key: number,
    options: { holdTime?: number } | undefined,
    token: CancellationToken
  ) => Promise<{ success: boolean }>;
};

export const pressKey = (
  backend: Backend,
  key: KeyName,
  token: CancellationToken
): Promise<{ success: boolean }> => {
  return backend.keyPress(Key[key], undefined, token);
};
