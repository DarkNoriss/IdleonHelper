import { navigation } from "./scripts/navigation/navigation"

/**
 * Script registry - all available scripts that can be run from the frontend
 * Organized by category for better structure
 *
 * This structure is used to generate fully-typed IPC handlers and preload methods
 */
export const scripts = {
  navigation,
} as const

/**
 * Type helper to extract the scripts structure for type-safe access
 */
export type Scripts = typeof scripts
