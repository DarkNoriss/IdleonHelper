import { cancellationManager, delay } from "../../cancellation-token"
import { getMainWindow } from "../../index"
import { logger } from "../../logger"
import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "../../weekly-battle-data"

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

      // Simulate work with 30-second delay
      await delay(30000, token)
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
