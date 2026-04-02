import type { CancellationToken } from "../../utils/cancellation-token";
import { codex } from "./codex";
import { navigateTo } from "./helpers";

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
