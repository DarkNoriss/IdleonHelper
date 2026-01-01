import { apply } from "./construction-apply"
import { solver } from "./construction-solver"

export const world3 = {
  construction: {
    solver,
    apply,
  },
} as const
