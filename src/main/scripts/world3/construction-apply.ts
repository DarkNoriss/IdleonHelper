import type { OptimalStep } from "../../../types/construction"
import { backendCommand } from "../../backend"
import { cancellationManager, logger } from "../../utils"
import { navigation } from "../navigation/navigation"

// Constants for future use
// const SPARE_COLUMNS = 3
const SPARE_ROWS = 5
const COGS_STEP = 48

const BOARD_FIRST_COORDS = { x: 210, y: 130 }
const SPARE_FIRST_COORDS = { x: 25, y: 130 }

export const getSparePage = (y: number): number => {
  return Math.floor(y / SPARE_ROWS) + 1
}

export const getSpareRowInPage = (y: number): number => {
  return y % SPARE_ROWS
}

export const getSpareLocationAfterPageChange = (
  location: { x: number; y: number },
  targetPage: number
): { x: number; y: number } => {
  const rowInPage = getSpareRowInPage(location.y)
  const pageIndex = targetPage - 1
  const newY = pageIndex * SPARE_ROWS + rowInPage
  return {
    x: location.x,
    y: newY,
  }
}

const calculateBoardCoords = (
  x: number,
  y: number
): { x: number; y: number } => {
  return {
    x: BOARD_FIRST_COORDS.x + x * COGS_STEP,
    y: BOARD_FIRST_COORDS.y + y * COGS_STEP,
  }
}

const calculateSpareCoords = (
  x: number,
  y: number
): { x: number; y: number } => {
  const rowInPage = getSpareRowInPage(y)

  return {
    x: SPARE_FIRST_COORDS.x + x * COGS_STEP,
    y: SPARE_FIRST_COORDS.y + rowInPage * COGS_STEP,
  }
}

export const apply = async (steps: OptimalStep[]): Promise<void> => {
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Applying optimized board")
  const token = cancellationManager.createToken()

  try {
    logger.log("Navigating to construction screen...")
    const navigationSuccess = await navigation.construction.toCogsTab(token)
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script")
      return
    }

    logger.log("Ensuring cog shelf is off...")
    await navigation.construction.ensureCogShelfOff(token)

    logger.log("Ensuring trash is off...")
    await navigation.construction.ensureTrashOff(token)

    logger.log("Ensuring first page...")
    await navigation.construction.ensureFirstPage(token)

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      logger.log(`Processing step ${i + 1}/${steps.length}`)

      let fromCoords: { x: number; y: number }
      let toCoords: { x: number; y: number }

      if (step.from.location === "board") {
        fromCoords = calculateBoardCoords(step.from.x, step.from.y)
      } else {
        const fromPage = getSparePage(step.from.y)
        await navigation.construction.navigateToPage(fromPage, token)
        fromCoords = calculateSpareCoords(step.from.x, step.from.y)
      }

      if (step.to.location === "board") {
        toCoords = calculateBoardCoords(step.to.x, step.to.y)
      } else {
        const toPage = getSparePage(step.to.y)
        await navigation.construction.navigateToPage(toPage, token)
        toCoords = calculateSpareCoords(step.to.x, step.to.y)
      }

      logger.log(
        `Dragging from (${fromCoords.x}, ${fromCoords.y}) to (${toCoords.x}, ${toCoords.y})`
      )
      await backendCommand.drag(fromCoords, toCoords, { instant: true }, token)
    }

    logger.log("Optimized board applied successfully")
  } catch (error) {
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Apply operation was cancelled")
      return
    }
    throw error
  } finally {
    cancellationManager.clearToken()
  }
}
