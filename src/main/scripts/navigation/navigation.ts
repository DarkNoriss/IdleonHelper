import { codex } from "./codex"
import { construction } from "./construction"
import { quickRef } from "./quick-ref"
import { ui } from "./ui"

/**
 * Navigation scripts for moving between different UI screens
 */
export const navigation = {
  ui,
  codex,
  construction,
  quickRef,
} as const
