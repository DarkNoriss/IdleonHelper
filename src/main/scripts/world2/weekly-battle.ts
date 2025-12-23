import { cancellationManager, delay } from "../../cancellation-token"
import { getMainWindow } from "../../index"
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
    const fetchedData = await fetchWeeklyBattleData()
    notifyChange(fetchedData)
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

    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      console.log("Weekly battle steps:", steps)

      // Simulate work with 30-second delay
      await delay(30000, token)
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        console.log("Operation was cancelled")
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
