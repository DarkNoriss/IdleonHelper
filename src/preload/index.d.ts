import type { ElectronAPI } from "@electron-toolkit/preload";

import type {
  OptimalStep,
  ParsedConstructionData,
  Score,
  SolverWeights,
} from "../types/construction";
import type { AppState, QueueSnapshot, ScriptMap } from "../types/scripts";

type ConnectionStatus = "connecting" | "connected" | "error";

type BackendStatus = {
  status: ConnectionStatus;
  error: string | null;
};

type WeeklyBattleStep = {
  stepName: string;
  steps: number[];
  rawSteps: string[];
};

type WeeklyBattleInfo = {
  dateFrom: string;
  dateTo: string;
  bossName: string;
  steps: WeeklyBattleStep[];
};

type WeeklyBattleData = {
  fetchedAt: string;
  info: WeeklyBattleInfo;
};

type LogLevel = "log" | "error" | "warn" | "info";

type LogEntry = {
  timestamp: number;
  level: LogLevel;
  message: string;
  runId?: string;
  scriptId?: string;
};

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: biome is not aware of the ElectronAPI type
  interface Window {
    api: {
      window: {
        close: () => void;
        minimize: () => void;
        maximize: () => void;
      };
      backend: Record<string, never>;
      script: {
        world2: {
          weeklyBattle: {
            fetch: () => Promise<WeeklyBattleData>;
            get: () => Promise<WeeklyBattleData | null>;
          };
        };
        // Legacy: construction solver
        world3: {
          construction: {
            solver: (
              inventory: ParsedConstructionData,
              weights: SolverWeights,
              solveTime?: number
            ) => Promise<{
              score: Score;
              steps: OptimalStep[];
            } | null>;
            solverCancel: () => Promise<void>;
          };
        };
      };
      queue: {
        enqueue: <T extends keyof ScriptMap>(
          id: T,
          ...args: ScriptMap[T]["args"]
        ) => Promise<{ itemId: string }>;
        remove: (itemId: string) => Promise<void>;
        pause: () => Promise<void>;
        resume: () => Promise<void>;
        clear: () => Promise<void>;
        get: () => Promise<QueueSnapshot>;
      };
      app: {
        isDev: () => Promise<boolean>;
      };
      update: {
        getVersion: () => Promise<string>;
        checkForUpdates: () => Promise<void>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        getStatus: () => Promise<{
          version: string;
          status:
            | "idle"
            | "checking"
            | "update-available"
            | "update-not-available"
            | "downloading"
            | "update-downloaded"
            | "installing"
            | "error";
          error?: string;
        }>;
        onStatusChange: (
          callback: (status: {
            version: string;
            status:
              | "idle"
              | "checking"
              | "update-available"
              | "update-not-available"
              | "downloading"
              | "update-downloaded"
              | "installing"
              | "error";
            error?: string;
          }) => void
        ) => () => void;
        onDownloadProgress: (
          callback: (progress: {
            percent: number;
            transferred: number;
            total: number;
          }) => void
        ) => () => void;
      };
      logs: {
        get: () => Promise<LogEntry[]>;
        onChange: (callback: (logs: LogEntry[]) => void) => () => void;
      };
      state: {
        get: <K extends keyof AppState>(key: K) => Promise<AppState[K]>;
        subscribe: <K extends keyof AppState>(
          key: K,
          callback: (value: AppState[K]) => void
        ) => () => void;
      };
      scriptConfigs: {
        publish: (scriptId: string, args: unknown[]) => Promise<void>;
      };
    };
    electron: ElectronAPI;
    logs: {
      get: () => Promise<LogEntry[]>;
      onChange: (callback: (logs: LogEntry[]) => void) => () => void;
    };
  }
}
