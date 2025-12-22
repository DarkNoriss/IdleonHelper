import { BrowserWindow } from "electron"

import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "../../weekly-battle-data"

let data: WeeklyBattleData | null = null
let mainWindow: BrowserWindow | null = null
const onChangeCallbacks: Array<(data: WeeklyBattleData | null) => void> = []

const notifyChange = (newData: WeeklyBattleData | null): void => {
  data = newData
  if (mainWindow) {
    mainWindow.webContents.send("weekly-battle-data-changed", newData)
  }
  onChangeCallbacks.forEach((callback) => callback(newData))
}

export const weeklyBattle = {
  setMainWindow: (window: BrowserWindow | null): void => {
    mainWindow = window
  },

  fetch: async (): Promise<WeeklyBattleData> => {
    const fetchedData = await fetchWeeklyBattleData()
    notifyChange(fetchedData)
    return fetchedData
  },

  get: async (): Promise<WeeklyBattleData | null> => {
    return data
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
