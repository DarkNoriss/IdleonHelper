import { cancellationManager, logger } from "../../utils"
import { navigation } from "../navigation/navigation"

export const apply = async (): Promise<void> => {
  // Check if already working
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Applying optimized board")
  // Create cancellation token
  const token = cancellationManager.createToken()

  try {
    logger.log("Navigating to construction screen...")
    await navigation.construction.toCogsTab(token)

    logger.log("Ensuring first page...")
    await navigation.construction.ensureFirstPage(token)

    logger.log("Optimized board applied successfully")
  } catch (error) {
    // Handle cancellation silently - it's a user action, not an error
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Apply operation was cancelled")
      return // Return gracefully without throwing
    }
    // Re-throw actual errors
    throw error
  } finally {
    // Clean up
    cancellationManager.clearToken()
  }
}
