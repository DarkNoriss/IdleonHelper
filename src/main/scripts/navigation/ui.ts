import { backendCommand } from "../../backend"
import { logger } from "../../utils"
import type { CancellationToken } from "../../utils/cancellation-token"

export const ui = {
  toCodex: async (token: CancellationToken): Promise<boolean> => {
    logger.log("Navigating to Codex...")
    const initialCheck = await backendCommand.isVisible(
      "codex/quik-ref",
      undefined,
      token
    )
    if (initialCheck) {
      logger.log("Codex already visible")
      return true
    }

    const result = await backendCommand.find("ui/codex", undefined, token)
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0], undefined, token)
    } else {
      logger.log("Codex button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.find(
      "codex/quik-ref",
      undefined,
      token
    )
    if (secondCheck.matches.length > 0) {
      logger.log("Codex opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/codex", undefined, token)
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0], undefined, token)
    } else {
      logger.log("Codex button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible(
      "codex/quik-ref",
      undefined,
      token
    )
    if (finalCheck) {
      logger.log("Codex opened successfully after second attempt")
      return true
    }

    logger.error(
      "Failed to navigate to codex - codex/quik-ref not visible after multiple attempts"
    )
    return false
  },

  toItems: async (token: CancellationToken): Promise<boolean> => {
    logger.log("Navigating to Items...")
    const initialCheck = await backendCommand.isVisible(
      "items/lock",
      undefined,
      token
    )
    if (initialCheck) {
      logger.log("Items already visible")
      return true
    }

    const result = await backendCommand.find("ui/items", undefined, token)
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0], undefined, token)
    } else {
      logger.log("Items button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.find(
      "items/lock",
      undefined,
      token
    )
    if (secondCheck.matches.length > 0) {
      logger.log("Items opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/items", undefined, token)
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0], undefined, token)
    } else {
      logger.log("Items button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible(
      "items/lock",
      undefined,
      token
    )
    if (finalCheck) {
      logger.log("Items opened successfully after second attempt")
      return true
    }

    logger.error(
      "Failed to navigate to items - items/lock not visible after multiple attempts"
    )
    return false
  },
} as const
