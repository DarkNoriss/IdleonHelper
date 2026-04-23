/**
 * Centralized logger utility for the Electron backend
 * Stores logs in memory array and maintains console output
 */

import { runContext } from "./run-context";

export type LogLevel = "log" | "error" | "warn" | "info";

export type LogEntry = {
  timestamp: number;
  level: LogLevel;
  message: string;
  runId?: string;
  scriptId?: string;
};

const logs: LogEntry[] = [];

// Callback to notify when logs change (set by main process after window is created)
let notifyLogsChanged: ((logs: LogEntry[]) => void) | null = null;

type EntryListener = (entry: LogEntry) => void;
const entryListeners: EntryListener[] = [];

export const subscribeToEntries = (listener: EntryListener): (() => void) => {
  entryListeners.push(listener);
  return () => {
    const index = entryListeners.indexOf(listener);
    if (index >= 0) {
      entryListeners.splice(index, 1);
    }
  };
};

/**
 * Set the callback function to notify when logs change
 */
export const setLogsChangeNotifier = (
  notifier: (logs: LogEntry[]) => void
): void => {
  notifyLogsChanged = notifier;
};

/**
 * Get all stored log entries
 */
export const getLogs = (): LogEntry[] => {
  return [...logs];
};

/**
 * Clear all stored logs
 */
export const clearLogs = (): void => {
  logs.length = 0;
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

/**
 * Add a log entry to the array and emit IPC event
 */
const addLog = (level: LogLevel, ...args: unknown[]): void => {
  const timestamp = Date.now();
  const message = args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      if (arg instanceof Error) {
        return arg.message;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

  const ctx = runContext.getStore();
  const entry: LogEntry = {
    timestamp,
    level,
    message,
    runId: ctx?.runId,
    scriptId: ctx?.scriptId,
  };

  logs.push(entry);

  // Notify listeners about log changes
  if (notifyLogsChanged) {
    notifyLogsChanged(getLogs());
  }

  for (const listener of entryListeners) {
    try {
      listener(entry);
    } catch {
      // Isolate listener failures so one bad sink does not break logging.
    }
  }
};

export const logger = {
  /**
   * Log informational messages
   */
  log: (...args: unknown[]): void => {
    const timestamp = formatTimestamp(Date.now());
    console.log(`[${timestamp}]`, ...args);
    addLog("log", ...args);
  },

  /**
   * Log error messages
   */
  error: (...args: unknown[]): void => {
    const timestamp = formatTimestamp(Date.now());
    console.error(`[${timestamp}]`, ...args);
    addLog("error", ...args);
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]): void => {
    const timestamp = formatTimestamp(Date.now());
    console.warn(`[${timestamp}]`, ...args);
    addLog("warn", ...args);
  },

  /**
   * Log info messages (alias for log)
   */
  info: (...args: unknown[]): void => {
    const timestamp = formatTimestamp(Date.now());
    console.info(`[${timestamp}]`, ...args);
    addLog("info", ...args);
  },
} as const;
