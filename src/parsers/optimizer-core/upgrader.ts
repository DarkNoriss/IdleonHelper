import type { UpgraderStep } from "@/types/upgrader";
import type { OptimizerGroupMode, OptimizerStep } from "./types";

// Reshapes optimizer steps into the upgrader's batched click list.
// "none" and "upgrade" both collapse consecutive same-slot picks (preserving
// optimizer order) - one batch per consecutive run, `levels` = run length.
// "summary" buckets globally by slot, then re-sorts by total gain (metric)
// or total cost (non-metric) to mirror the displayed summary table.
export function toUpgraderSteps(
  steps: readonly OptimizerStep[],
  mode: OptimizerGroupMode,
  isMetric: boolean
): UpgraderStep[] {
  if (steps.length === 0) {
    return [];
  }

  if (mode === "summary") {
    const buckets = new Map<
      number,
      { levels: number; cost: number; gain: number | null }
    >();
    for (const s of steps) {
      const existing = buckets.get(s.slot);
      if (existing) {
        existing.levels += 1;
        existing.cost += s.cost;
        if (existing.gain !== null && s.gain !== null) {
          existing.gain += s.gain;
        } else {
          existing.gain = null;
        }
      } else {
        buckets.set(s.slot, { levels: 1, cost: s.cost, gain: s.gain });
      }
    }
    const entries = Array.from(buckets.entries()).map(([index, b]) => ({
      index,
      levels: b.levels,
      cost: b.cost,
      gain: b.gain,
    }));
    if (isMetric) {
      entries.sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0));
    } else {
      entries.sort((a, b) => a.cost - b.cost);
    }
    return entries.map(({ index, levels }) => ({ index, levels }));
  }

  const collapsed: UpgraderStep[] = [];
  for (const s of steps) {
    const last = collapsed.at(-1);
    if (last && last.index === s.slot) {
      last.levels += 1;
    } else {
      collapsed.push({ index: s.slot, levels: 1 });
    }
  }
  return collapsed;
}
