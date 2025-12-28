import type { CancellationToken } from "../../utils/cancellation-token"
import { navigateTo } from "./helpers"
import { ui } from "./ui"

export const codex = {
  toQuikRef: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "quik-ref/storage",
      "codex/quik-ref",
      ui.toCodex,
      token,
      "Quick Ref"
    )
  },
} as const
