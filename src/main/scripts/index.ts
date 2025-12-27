import { general } from "./general"
import { navigation } from "./navigation/navigation"
import { world2 } from "./world2"
import { world6 } from "./world6"

export const scripts = {
  general,
  navigation,
  world2,
  world6,
} as const

export type Scripts = typeof scripts
