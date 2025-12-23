import { backendCommand } from "../../backend"
import { logger } from "../../utils"

export const ui = {
  toCodex: async (): Promise<boolean> => {
    logger.log("Navigating to Codex...")
    const initialCheck = await backendCommand.isVisible("codex/quik-ref")
    if (initialCheck) {
      logger.log("Codex already visible")
      return true
    }

    const result = await backendCommand.find("ui/codex")
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0])
    } else {
      logger.log("Codex button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.isVisible("codex/quik-ref")
    if (secondCheck) {
      logger.log("Codex opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/codex")
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0])
    } else {
      logger.log("Codex button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible("codex/quik-ref")
    if (finalCheck) {
      logger.log("Codex opened successfully after second attempt")
      return true
    }

    logger.error(
      "Failed to navigate to codex - codex/quik-ref not visible after multiple attempts"
    )
    return false
  },

  toItems: async (): Promise<boolean> => {
    logger.log("Navigating to Items...")
    const initialCheck = await backendCommand.isVisible("items/lock")
    if (initialCheck) {
      logger.log("Items already visible")
      return true
    }

    const result = await backendCommand.find("ui/items")
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0])
    } else {
      logger.log("Items button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.isVisible("items/lock")
    if (secondCheck) {
      logger.log("Items opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/items")
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0])
    } else {
      logger.log("Items button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible("items/lock")
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
