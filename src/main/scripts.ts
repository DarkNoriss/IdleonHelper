import { navigation } from "./scripts/navigation/navigation"
import { world2 } from "./scripts/world-2"

export const scripts = {
  navigation,
  "world-2": world2,
} as const

export type Scripts = typeof scripts
