import { cancellationManager, logger } from "../../utils"
import { navigation } from "../navigation/navigation"

export const test = {
  run: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log("Starting test script")
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      token.throwIfCancelled()
      logger.log("Test script: navigating to Codex...")
      await navigation.ui.toCodex(token)

      token.throwIfCancelled()
      logger.log("Test script: navigating to Items...")
      await navigation.ui.toItems(token)

      logger.log("Test script completed successfully")
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Test script operation was cancelled")
        return // Return gracefully without throwing
      }
      // Re-throw actual errors
      throw error
    } finally {
      // Clean up
      cancellationManager.clearToken()
    }
  },
} as const
