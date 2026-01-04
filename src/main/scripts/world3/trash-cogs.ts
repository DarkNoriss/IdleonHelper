import { backendCommand } from "../../backend"
import { cancellationManager, logger } from "../../utils"
import { navigation } from "../navigation/navigation"
import {
  COGS_STEP,
  SPARE_COLUMNS,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants"

export const trashCogs = async (): Promise<void> => {
  // Check if already working
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Starting trash cogs")
  // Create cancellation token
  const token = cancellationManager.createToken()

  try {
    logger.log("Navigating to cogs tab...")
    const navigationSuccess = await navigation.construction.toCogsTab(token)
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script")
      return
    }

    logger.log("Ensuring cog shelf is off...")
    await navigation.construction.ensureCogShelfOff(token)

    logger.log("Ensuring first page...")
    await navigation.construction.ensureFirstPage(token)

    logger.log("Ensuring trash is open...")
    await navigation.construction.ensureTrashOn(token)

    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      logger.log(`Processing page ${currentPage}...`)

      // Click on every slot in the spare area (3 columns x 5 rows)
      for (let col = 0; col < SPARE_COLUMNS; col++) {
        for (let row = 0; row < SPARE_ROWS; row++) {
          token.throwIfCancelled()

          const x = SPARE_FIRST_COORDS.x + col * COGS_STEP
          const y = SPARE_FIRST_COORDS.y + row * COGS_STEP

          await backendCommand.click(
            { x, y },
            { times: 2, interval: 25, holdTime: 10 },
            token
          )
        }
      }

      // Check if we can go to the next page
      const nextPageAvailable = await backendCommand.isVisible(
        "construction/cogs-page-next",
        undefined,
        token
      )

      if (nextPageAvailable) {
        currentPage++
        logger.log(`Navigating to page ${currentPage}...`)
        await navigation.construction.navigateToPage(currentPage, token)
      } else {
        hasNextPage = false
        logger.log("Reached last page")
      }
    }

    logger.log("Closing trash...")
    await navigation.construction.ensureTrashOff(token)

    logger.log("Trash cogs completed successfully")
  } catch (error) {
    // Handle cancellation silently - it's a user action, not an error
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Trash cogs operation was cancelled")
      return // Return gracefully without throwing
    }
    // Re-throw actual errors
    throw error
  } finally {
    // Clean up
    cancellationManager.clearToken()
  }
}
