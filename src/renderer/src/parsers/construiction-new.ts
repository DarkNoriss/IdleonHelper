import type { IdleonJson } from "@/types/idleon-json"

export const parseConstructionNew = (rawJson: IdleonJson) => {
  return {
    totalBuildRate: 0,
    totalExpRate: 0,
    totalFlaggyRate: 0,
  }
}
