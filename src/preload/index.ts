import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

import type { OptimalStep } from "../types/construction";

const api = {
  window: {
    close: () => {
      ipcRenderer.send("window-close");
    },
  },
  backend: {
    getStatus: () => {
      return ipcRenderer.invoke("backend:getStatus");
    },
    onStatusChange: (
      callback: (status: { status: string; error: string | null }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { status: string; error: string | null }
      ) => {
        callback(status);
      };
      ipcRenderer.on("backend-status-changed", handler);
      return () => {
        ipcRenderer.off("backend-status-changed", handler);
      };
    },
  },
  script: {
    getStatus: () => {
      return ipcRenderer.invoke("script:get-status");
    },
    cancel: () => {
      return ipcRenderer.invoke("script:cancel");
    },
    onStatusChange: (callback: (status: { isWorking: boolean }) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { isWorking: boolean }
      ) => {
        callback(status);
      };
      ipcRenderer.on("script-status-changed", handler);
      return () => {
        ipcRenderer.off("script-status-changed", handler);
      };
    },
    world2: {
      weeklyBattle: {
        fetch: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.fetch");
        },
        get: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.get");
        },
        run: (steps: number[]) => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.run", steps);
        },
        onChange: (callback: (data: unknown) => void) => {
          const handler = (_event: IpcRendererEvent, data: unknown) => {
            callback(data);
          };
          ipcRenderer.on("weekly-battle-data-changed", handler);
          return () => {
            ipcRenderer.off("weekly-battle-data-changed", handler);
          };
        },
      },
    },
    world6: {
      farming: {
        start: () => {
          return ipcRenderer.invoke("script:world-6.farming.start");
        },
        lockUnlock: () => {
          return ipcRenderer.invoke("script:world-6.farming.lock-unlock");
        },
      },
      summoning: {
        startEndlessAutobattler: () => {
          return ipcRenderer.invoke(
            "script:world-6.summoning.start-endless-autobattler"
          );
        },
        startAutobattler: () => {
          return ipcRenderer.invoke(
            "script:world-6.summoning.start-autobattler"
          );
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
          );
        },
        apply: (steps: OptimalStep[]) => {
          return ipcRenderer.invoke("script:world-3.construction.apply", steps);
        },
        collectCogs: () => {
          return ipcRenderer.invoke("script:world-3.construction.collect-cogs");
        },
        trashCogs: () => {
          return ipcRenderer.invoke("script:world-3.construction.trash-cogs");
        },
      },
    },
    general: {
      test: {
        run: () => {
          return ipcRenderer.invoke("script:general.test.run");
        },
      },
      storeItems: {
        run: () => {
          return ipcRenderer.invoke("script:general.store-items.run");
        },
      },
    },
  },
  app: {
    isDev: () => {
      return ipcRenderer.invoke("app:isDev");
    },
  },
  update: {
    getVersion: () => {
      return ipcRenderer.invoke("update:get-version");
    },
    checkForUpdates: () => {
      return ipcRenderer.invoke("update:check");
    },
    downloadUpdate: () => {
      return ipcRenderer.invoke("update:download");
    },
    installUpdate: () => {
      return ipcRenderer.invoke("update:install");
    },
    getStatus: () => {
      return ipcRenderer.invoke("update:get-status");
    },
    onStatusChange: (
      callback: (status: {
        version: string;
        status: string;
        error?: string;
      }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { version: string; status: string; error?: string }
      ) => {
        callback(status);
      };
      ipcRenderer.on("update-status-changed", handler);
      return () => {
        ipcRenderer.off("update-status-changed", handler);
      };
    },
    onDownloadProgress: (
      callback: (progress: {
        percent: number;
        transferred: number;
        total: number;
      }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        progress: { percent: number; transferred: number; total: number }
      ) => {
        callback(progress);
      };
      ipcRenderer.on("update-download-progress", handler);
      return () => {
        ipcRenderer.off("update-download-progress", handler);
      };
    },
  },
  logs: {
    get: () => {
      return ipcRenderer.invoke("logs:get");
    },
    onChange: (callback: (logs: unknown[]) => void) => {
      const handler = (_event: IpcRendererEvent, logs: unknown[]) => {
        callback(logs);
      };
      ipcRenderer.on("logs-changed", handler);
      return () => {
        ipcRenderer.off("logs-changed", handler);
      };
    },
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
