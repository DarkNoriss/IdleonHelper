import { backendCommand } from "../../backend"
import { cancellationManager, delay, logger } from "../../utils"
import { navigation } from "../navigation/navigation"
import {
  COGS_STEP,
  COLLECT_ULTIMATE_COGS,
  SPARE_COLUMNS,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants"

export const collectCogs = async (): Promise<void> => {
  // Check if already working
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Starting collect cogs")
  // Create cancellation token
  const token = cancellationManager.createToken()

  try {
    logger.log("Navigating to cogs tab...")
    const navigationSuccess = await navigation.construction.toCogsTab(token)
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script")
      return
    }

    logger.log("Ensuring cog shelf is open...")
    await navigation.construction.ensureCogShelfOn(token)

    logger.log("Ensuring last page...")
    await navigation.construction.ensureLastPage(token)

    logger.log("Ensuring trash is closed...")
    await navigation.construction.ensureTrashOff(token)

    // Calculate spare area bounds with 4px padding
    const PADDING = 4
    const lastSpareX = SPARE_FIRST_COORDS.x + (SPARE_COLUMNS - 1) * COGS_STEP
    const lastSpareY = SPARE_FIRST_COORDS.y + (SPARE_ROWS - 1) * COGS_STEP
    const spareAreaOffset = {
      left: SPARE_FIRST_COORDS.x - PADDING,
      top: SPARE_FIRST_COORDS.y - PADDING,
      right: lastSpareX + COGS_STEP + PADDING,
      bottom: lastSpareY + COGS_STEP + PADDING,
    }

    const MAX_ITERATIONS = 50
    let iteration = 0

    while (iteration < MAX_ITERATIONS) {
      token.throwIfCancelled()

      logger.log("Checking if board is empty (within spare area)...")
      const isBoardEmpty = await backendCommand.isVisible(
        "construction/board_empty",
        { offset: spareAreaOffset },
        token
      )

      if (!isBoardEmpty) {
        logger.log("Board is not empty (spare is full), collection complete")
        break
      }

      await delay(250, token)

      iteration++
      logger.log(
        `Board is empty, clicking collect ultimate cogs button 10 times (iteration ${iteration}/${MAX_ITERATIONS})...`
      )
      await backendCommand.click(
        COLLECT_ULTIMATE_COGS,
        { times: 10, interval: 25, holdTime: 10 },
        token
      )
    }

    if (iteration >= MAX_ITERATIONS) {
      logger.log(`Reached maximum iterations (${MAX_ITERATIONS}), stopping`)
    }

    logger.log("Closing cog shelf...")
    await navigation.construction.ensureCogShelfOff(token)

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
