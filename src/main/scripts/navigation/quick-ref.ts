import type { CancellationToken } from "../../utils/cancellation-token"
import { navigateTo } from "./helpers"
import { codex } from "./codex"

export const quickRef = {
  toStorage: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "items/lock",
      "quik-ref/storage",
      codex.toQuikRef,
      token,
      "Storage"
    )
  },
} as const
