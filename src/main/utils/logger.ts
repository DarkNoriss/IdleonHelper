/**
 * Centralized logger utility for the Electron backend
 * Stores logs in memory array and maintains console output
 */

export type LogLevel = "log" | "error" | "warn" | "info"

export type LogEntry = {
  timestamp: number
  level: LogLevel
  message: string
}

const logs: LogEntry[] = []

// Callback to notify when logs change (set by main process after window is created)
let notifyLogsChanged: ((logs: LogEntry[]) => void) | null = null

/**
 * Set the callback function to notify when logs change
 */
export const setLogsChangeNotifier = (
  notifier: (logs: LogEntry[]) => void
): void => {
  notifyLogsChanged = notifier
}

/**
 * Get all stored log entries
 */
export const getLogs = (): LogEntry[] => {
  return [...logs]
}

/**
 * Clear all stored logs
 */
export const clearLogs = (): void => {
  logs.length = 0
}

/**
 * Add a log entry to the array and emit IPC event
 */
const addLog = (level: LogLevel, ...args: unknown[]): void => {
  const timestamp = Date.now()
  const message = args
    .map((arg) => {
      if (typeof arg === "string") return arg
      if (arg instanceof Error) return arg.message
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(" ")

  const entry: LogEntry = {
    timestamp,
    level,
    message,
  }

  logs.push(entry)

  // Notify listeners about log changes
  if (notifyLogsChanged) {
    notifyLogsChanged(getLogs())
  }
}

export const logger = {
  /**
   * Log informational messages
   */
  log: (...args: unknown[]): void => {
    console.log(...args)
    addLog("log", ...args)
  },

  /**
   * Log error messages
   */
  error: (...args: unknown[]): void => {
    console.error(...args)
    addLog("error", ...args)
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args)
    addLog("warn", ...args)
  },

  /**
   * Log info messages (alias for log)
   */
  info: (...args: unknown[]): void => {
    console.info(...args)
    addLog("info", ...args)
  },
} as const
