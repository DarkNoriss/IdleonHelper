import type { CancellationToken } from "../../utils/cancellation-token.ts";
import { codex } from "./codex.ts";
import { navigateTo } from "./helpers.ts";

export const quickRef = {
  toStorage: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/quik-ref/storage/deposit_cash",
      "ui/codex/quik-ref/storage/storage",
      codex.toQuikRef,
      token,
      "Storage"
    );
  },
} as const;
