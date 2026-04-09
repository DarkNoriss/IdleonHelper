import type { CancellationToken } from "../../utils/cancellation-token";
import { navigateTo } from "./helpers";

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
  toMap: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/map/world_1",
      "ui/map",
      undefined,
      token,
      "Map"
    );
  },
} as const;
