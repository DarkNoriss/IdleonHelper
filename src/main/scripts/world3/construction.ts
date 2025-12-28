import { cancellationManager, logger } from "../../utils"
import { navigation } from "../navigation/navigation"

export const construction = {
  run: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log("Starting construction script")
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      logger.log("Construction script: navigating to Cogs Tab...")
      await navigation.construction.toCogsTab(token)

      logger.log("Construction script completed successfully")
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Construction script operation was cancelled")
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
