import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend"
import { cancellationManager, logger } from "../../utils"
import { FARMING_GRID } from "./farming-constants"

export const lockUnlock = async (): Promise<void> => {
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Starting lock/unlock crops")
  const token = cancellationManager.createToken()

  try {
    token.throwIfCancelled()

    const startX = FARMING_GRID.FIRST_POSITION.x
    const startY = FARMING_GRID.FIRST_POSITION.y

    const allCoordinates: Array<{ x: number; y: number }> = []
    for (let row = 0; row < FARMING_GRID.ROWS; row++) {
      for (let col = 0; col < FARMING_GRID.COLUMNS; col++) {
        allCoordinates.push({
          x: startX + col * FARMING_GRID.X_STEP,
          y: startY + row * FARMING_GRID.Y_STEP,
        })
      }
    }

    logger.log(`Calculated ${allCoordinates.length} crop positions`)

    const presetOptions = getClickOptionsFromPreset(ClickPreset.UltraFast)
    for (const coordinate of allCoordinates) {
      token.throwIfCancelled()
      await backendCommand.click(coordinate, presetOptions, token)
    }

    logger.log(`Clicked on ${allCoordinates.length} crop positions`)
  } catch (error) {
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Lock/unlock operation was cancelled")
      return
    }
    throw error
  } finally {
    cancellationManager.clearToken()
  }
}
