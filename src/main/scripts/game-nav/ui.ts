import type { CancellationToken } from "../../utils/cancellation-token.ts";
import { navigateTo } from "./helpers.ts";

export const ui = {
  toCodex: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/guild",
      "ui/codex",
      undefined,
      token,
      "Codex"
    );
  },
  toItems: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/items/lock",
      "ui/items",
      undefined,
      token,
      "Items"
    );
  },
} as const;
