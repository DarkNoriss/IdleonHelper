import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

// Custom APIs for renderer
const api = {
  window: {
    close: () => ipcRenderer.send("window-close"),
  },
  world3: {
    processJson: (jsonString: string) =>
      ipcRenderer.invoke("world-3-construction:process-json", jsonString),
  },
  gamewindow: {
    find: () => ipcRenderer.invoke("gamewindow:find"),
    screenshot: () => ipcRenderer.invoke("gamewindow:screenshot"),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
