import type { CancellationToken } from "../../utils/cancellation-token"
import { codex } from "./codex"
import { navigateTo } from "./helpers"

export const construction = {
  toConstruction: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "construction/cogs_tab",
      "quik-ref/construction",
      codex.toQuikRef,
      token,
      "Construction"
    )
  },
  toCogsTab: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "construction/total-build-rate",
      "construction/cogs_tab",
      construction.toConstruction,
      token,
      "Cogs Tab"
    )
  },
} as const
