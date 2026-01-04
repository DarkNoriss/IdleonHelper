import { cancellationManager, delay, logger } from "../../utils"

export const collectCogs = async (): Promise<void> => {
  // Check if already working
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Starting collect cogs")
  // Create cancellation token
  const token = cancellationManager.createToken()

  try {
    token.throwIfCancelled()
    await delay(30000, token) // 30 seconds
    logger.log("Collect cogs completed successfully")
  } catch (error) {
    // Handle cancellation silently - it's a user action, not an error
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Collect cogs operation was cancelled")
      return // Return gracefully without throwing
    }
    // Re-throw actual errors
    throw error
  } finally {
    // Clean up
    cancellationManager.clearToken()
  }
}
