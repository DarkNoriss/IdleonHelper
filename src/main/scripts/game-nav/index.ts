import { codex } from "./codex.ts";
import { construction } from "./construction.ts";
import { quickRef } from "./quick-ref.ts";
import { ui } from "./ui.ts";

/**
 * Navigation scripts for moving between different UI screens
 */
export const navigation = {
  ui,
  codex,
  construction,
  quickRef,
} as const;
