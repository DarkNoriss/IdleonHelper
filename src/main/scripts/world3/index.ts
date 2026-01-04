import { collectCogs } from "./collect-cogs"
import { apply } from "./construction-apply"
import { solver } from "./construction-solver"
import { trashCogs } from "./trash-cogs"

export const world3 = {
  construction: {
    solver,
    apply,
    collectCogs,
    trashCogs,
  },
} as const
