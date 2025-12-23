/**
 * Centralized logger utility for the Electron backend
 * Currently wraps console methods, structured for future enhancements
 * (file logging, log levels, formatting, etc.)
 */
export const logger = {
  /**
   * Log informational messages
   */
  log: (...args: unknown[]): void => {
    console.log(...args)
  },

  /**
   * Log error messages
   */
  error: (...args: unknown[]): void => {
    console.error(...args)
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args)
  },

  /**
   * Log info messages (alias for log)
   */
  info: (...args: unknown[]): void => {
    console.info(...args)
  },
} as const
