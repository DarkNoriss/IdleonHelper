import type { CancellationToken } from "../../utils/cancellation-token.ts";
import { navigateTo } from "./helpers.ts";
import { ui } from "./ui.ts";

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
} as const;
