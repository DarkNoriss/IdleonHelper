import { backendCommand } from "../../backend/backend-command"
import { getMainWindow } from "../../index"
import { cancellationManager, logger } from "../../utils"
import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "./weekly-battle-data"

// Coordinate constants for weekly battle steps
const STEP_1_COORDS = { x: 613, y: 337 }
const STEP_2_COORDS = { x: 613, y: 398 }
const STEP_3_COORDS = { x: 613, y: 459 }

let data: WeeklyBattleData | null = null
const onChangeCallbacks: Array<(data: WeeklyBattleData | null) => void> = []

const notifyChange = (newData: WeeklyBattleData | null): void => {
  data = newData
  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.webContents.send("weekly-battle-data-changed", newData)
  }
  onChangeCallbacks.forEach((callback) => callback(newData))
}

export const weeklyBattle = {
  fetch: async (): Promise<WeeklyBattleData> => {
    logger.log("Fetching weekly battle data...")
    const fetchedData = await fetchWeeklyBattleData()
    notifyChange(fetchedData)
    logger.log("Weekly battle data fetched successfully")
    return fetchedData
  },

  get: async (): Promise<WeeklyBattleData | null> => {
    return data
  },

  run: async (steps: number[]): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log(`Starting weekly battle run with ${steps.length} steps`)
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      logger.log(`Weekly battle steps: ${steps.join(", ")}`)

      // Step 1: Check if weekly battle is on cooldown
      logger.log("Checking if weekly battle is on cooldown...")
      const isOnCooldown = await backendCommand.isVisible(
        "weekly-battle/wait",
        undefined,
        token
      )
      if (isOnCooldown) {
        logger.log("Weekly battle is on cooldown - cannot proceed")
        return
      }

      // Step 2: Check if restart is needed
      logger.log("Checking if restart is needed...")
      const needsRestart = await backendCommand.isVisible(
        "weekly-battle/restart",
        undefined,
        token
      )
      if (needsRestart) {
        logger.log("Restarting weekly battle...")
        const restartResult = await backendCommand.find(
          "weekly-battle/restart",
          undefined,
          token
        )
        if (restartResult.matches.length > 0) {
          await backendCommand.click(restartResult.matches[0], undefined, token)
          logger.log("Weekly battle restarted successfully")
        } else {
          logger.error("Restart image found but no matches returned")
        }
      }

      // Step 3: Verify we're on the select screen
      logger.log("Verifying select screen is visible...")
      const isSelectVisible = await backendCommand.isVisible(
        "weekly-battle/select",
        undefined,
        token
      )
      if (!isSelectVisible) {
        logger.error("Weekly battle select screen not found")
        throw new Error("Weekly battle select screen not found")
      }
      logger.log("Select screen confirmed")

      // Step 4: Execute steps by clicking coordinates
      logger.log(`Executing ${steps.length} steps...`)
      const stepCoords = [STEP_1_COORDS, STEP_2_COORDS, STEP_3_COORDS]

      for (let i = 0; i < steps.length; i++) {
        const stepNumber = steps[i]

        // Validate step number (should be 1, 2, or 3)
        if (stepNumber < 1 || stepNumber > 3) {
          logger.error(
            `Invalid step number: ${stepNumber}. Expected 1, 2, or 3.`
          )
          throw new Error(`Invalid step number: ${stepNumber}`)
        }

        const coords = stepCoords[stepNumber - 1]
        logger.log(
          `Clicking step ${stepNumber} at coordinates (${coords.x}, ${coords.y})`
        )

        await backendCommand.click(coords, undefined, token)
      }

      logger.log("Weekly battle run completed successfully")
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Weekly battle operation was cancelled")
        return // Return gracefully without throwing
      }
      // Re-throw actual errors
      throw error
    } finally {
      // Clean up
      cancellationManager.clearToken()
    }
  },

  onChange: (
    callback: (data: WeeklyBattleData | null) => void
  ): (() => void) => {
    onChangeCallbacks.push(callback)
    callback(data)
    return () => {
      const index = onChangeCallbacks.indexOf(callback)
      if (index > -1) {
        onChangeCallbacks.splice(index, 1)
      }
    }
  },
} as const
