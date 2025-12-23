import { navigation } from "./navigation/navigation"
import { world2 } from "./world2"

export const scripts = {
  navigation,
  world2,
} as const

export type Scripts = typeof scripts
