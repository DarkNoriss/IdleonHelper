import { navigation } from "./scripts/navigation/navigation"
import { world2 } from "./scripts/world2"

export const scripts = {
  navigation,
  world2,
} as const

export type Scripts = typeof scripts
