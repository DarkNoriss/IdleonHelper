import { cancellationManager, delay, logger } from "../../utils"

export const summoning = {
  startEndlessAutobattler: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log("Starting endless autobattler")
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      while (!token.isCancelled()) {
        token.throwIfCancelled()
        logger.log("Endless autobattler iteration...")
        await delay(60000, token) // 1 minute
      }
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Endless autobattler operation was cancelled")
        return // Return gracefully without throwing
      }
      // Re-throw actual errors
      throw error
    } finally {
      // Clean up
      cancellationManager.clearToken()
    }
  },

  startAutobattler: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log("Starting autobattler")
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      while (!token.isCancelled()) {
        token.throwIfCancelled()
        logger.log("Autobattler iteration...")
        await delay(60000, token) // 1 minute
      }
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Autobattler operation was cancelled")
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
