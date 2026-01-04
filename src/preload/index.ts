import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

import type { OptimalStep } from "../types/construction"

const api = {
  window: {
    close: () => {
      ipcRenderer.send("window-close")
    },
  },
  backend: {
    getStatus: () => {
      return ipcRenderer.invoke("backend:getStatus")
    },
    onStatusChange: (
      callback: (status: { status: string; error: string | null }) => void
    ) => {
      ipcRenderer.on("backend-status-changed", (_event, status) =>
        callback(status)
      )
      return () => {
        ipcRenderer.removeAllListeners("backend-status-changed")
      }
    },
  },
  script: {
    getStatus: () => {
      return ipcRenderer.invoke("script:get-status")
    },
    cancel: () => {
      return ipcRenderer.invoke("script:cancel")
    },
    onStatusChange: (callback: (status: { isWorking: boolean }) => void) => {
      ipcRenderer.on("script-status-changed", (_event, status) =>
        callback(status)
      )
      return () => {
        ipcRenderer.removeAllListeners("script-status-changed")
      }
    },
    world2: {
      weeklyBattle: {
        fetch: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.fetch")
        },
        get: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.get")
        },
        run: (steps: number[]) => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.run", steps)
        },
        onChange: (callback: (data: unknown) => void) => {
          ipcRenderer.on("weekly-battle-data-changed", (_event, data) =>
            callback(data)
          )
          return () => {
            ipcRenderer.removeAllListeners("weekly-battle-data-changed")
          }
        },
      },
    },
    world6: {
      summoning: {
        startEndlessAutobattler: () => {
          return ipcRenderer.invoke(
            "script:world-6.summoning.start-endless-autobattler"
          )
        },
        startAutobattler: () => {
          return ipcRenderer.invoke(
            "script:world-6.summoning.start-autobattler"
          )
        },
      },
    },
    world3: {
      construction: {
        solver: (
          inventory: unknown,
          weights: { buildRate: number; exp: number; flaggy: number },
          solveTime?: number
        ) => {
          return ipcRenderer.invoke(
            "script:world-3.construction.solver",
            inventory,
            weights,
            solveTime
          )
        },
        apply: (steps: OptimalStep[]) => {
          return ipcRenderer.invoke("script:world-3.construction.apply", steps)
        },
        collectCogs: () => {
          return ipcRenderer.invoke("script:world-3.construction.collect-cogs")
        },
        trashCogs: () => {
          return ipcRenderer.invoke("script:world-3.construction.trash-cogs")
        },
      },
    },
    general: {
      test: {
        run: () => {
          return ipcRenderer.invoke("script:general.test.run")
        },
      },
    },
  },
  app: {
    isDev: () => {
      return ipcRenderer.invoke("app:isDev")
    },
  },
  update: {
    getVersion: () => {
      return ipcRenderer.invoke("update:get-version")
    },
    checkForUpdates: () => {
      return ipcRenderer.invoke("update:check")
    },
    downloadUpdate: () => {
      return ipcRenderer.invoke("update:download")
    },
    installUpdate: () => {
      return ipcRenderer.invoke("update:install")
    },
    getStatus: () => {
      return ipcRenderer.invoke("update:get-status")
    },
    onStatusChange: (
      callback: (status: {
        version: string
        status: string
        error?: string
      }) => void
    ) => {
      ipcRenderer.on("update-status-changed", (_event, status) =>
        callback(status)
      )
      return () => {
        ipcRenderer.removeAllListeners("update-status-changed")
      }
    },
    onDownloadProgress: (
      callback: (progress: {
        percent: number
        transferred: number
        total: number
      }) => void
    ) => {
      ipcRenderer.on("update-download-progress", (_event, progress) =>
        callback(progress)
      )
      return () => {
        ipcRenderer.removeAllListeners("update-download-progress")
      }
    },
  },
  logs: {
    get: () => {
      return ipcRenderer.invoke("logs:get")
    },
    onChange: (callback: (logs: unknown[]) => void) => {
      ipcRenderer.on("logs-changed", (_event, logs) => callback(logs))
      return () => {
        ipcRenderer.removeAllListeners("logs-changed")
      }
    },
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
