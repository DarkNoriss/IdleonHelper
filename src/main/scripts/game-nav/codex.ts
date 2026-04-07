import type { CancellationToken } from "../../utils/cancellation-token";
import { navigateTo } from "./helpers";
import { ui } from "./ui";

export const codex = {
  toQuikRef: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/quik-ref/storage/storage",
      "ui/codex/quik-ref",
      ui.toCodex,
      token,
      "Quick Ref"
    );
  },

  toCards: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/cards/card_sets",
      "ui/codex/cards",
      ui.toCodex,
      token,
      "Cards"
    );
  },
} as const;
