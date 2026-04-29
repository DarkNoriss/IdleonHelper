import type {
  OptimizerCategory,
  OptimizerGroupMode,
  OptimizerRow,
  OptimizerStep,
} from "@/types/sushi-station";

/**
 * Reshapes greedy steps into displayable rows according to `mode`.
 *
 * - "none": one row per step (passthrough).
 * - "upgrade": collapses consecutive same-name picks into a single range row.
 *   Mirrors toolbox `GenericUpgradeOptimizer.jsx:139-200`.
 * - "summary": bins all picks by name into one row each. Sort differs from
 *   toolbox: we sort by total cost ascending for "all" and total gain
 *   descending for metric categories — first-appearance order from
 *   `Object.values(grouped)` is meaningless once rows are collapsed.
 */
export function groupSteps(
  steps: readonly OptimizerStep[],
  mode: OptimizerGroupMode,
  category: OptimizerCategory
): OptimizerRow[] {
  if (steps.length === 0) {
    return [];
  }

  if (mode === "none") {
    return steps.map((s) => ({
      rank: s.rank,
      name: s.name,
      fromLevel: s.fromLevel,
      toLevel: s.toLevel,
      cost: s.cost,
      gain: s.gain,
      efficiency: s.efficiency,
      cumulativeCost: s.cumulativeCost,
      count: 1,
    }));
  }

  if (mode === "upgrade") {
    return collapseConsecutive(steps);
  }

  return collapseSummary(steps, category);
}

function collapseConsecutive(steps: readonly OptimizerStep[]): OptimizerRow[] {
  const rows: OptimizerRow[] = [];
  let group: OptimizerStep[] = [];

  const flush = () => {
    if (group.length === 0) {
      return;
    }
    const first = group[0] as OptimizerStep;
    const last = group.at(-1) as OptimizerStep;
    const totalCost = group.reduce((acc, s) => acc + s.cost, 0);
    const totalGain =
      first.gain === null
        ? null
        : group.reduce((acc, s) => acc + (s.gain ?? 0), 0);
    rows.push({
      rank: rows.length + 1,
      name: first.name,
      fromLevel: first.fromLevel,
      toLevel: last.toLevel,
      cost: totalCost,
      gain: totalGain,
      efficiency: totalGain === null ? null : totalGain / totalCost,
      cumulativeCost: last.cumulativeCost,
      count: group.length,
    });
    group = [];
  };

  for (const step of steps) {
    const head = group[0];
    if (head && head.name !== step.name) {
      flush();
    }
    group.push(step);
  }
  flush();

  return rows;
}

function collapseSummary(
  steps: readonly OptimizerStep[],
  category: OptimizerCategory
): OptimizerRow[] {
  const buckets = new Map<string, OptimizerStep[]>();
  for (const step of steps) {
    const bucket = buckets.get(step.name);
    if (bucket) {
      bucket.push(step);
    } else {
      buckets.set(step.name, [step]);
    }
  }

  const rows: OptimizerRow[] = [];
  for (const bucket of buckets.values()) {
    const first = bucket[0] as OptimizerStep;
    let minFrom = first.fromLevel;
    let maxTo = first.toLevel;
    let totalCost = 0;
    let totalGain: number | null = first.gain === null ? null : 0;
    for (const s of bucket) {
      if (s.fromLevel < minFrom) {
        minFrom = s.fromLevel;
      }
      if (s.toLevel > maxTo) {
        maxTo = s.toLevel;
      }
      totalCost += s.cost;
      if (totalGain !== null) {
        totalGain += s.gain ?? 0;
      }
    }
    rows.push({
      rank: 0,
      name: first.name,
      fromLevel: minFrom,
      toLevel: maxTo,
      cost: totalCost,
      gain: totalGain,
      efficiency: totalGain === null ? null : totalGain / totalCost,
      cumulativeCost: null,
      count: bucket.length,
    });
  }

  if (category === "all") {
    rows.sort((a, b) => a.cost - b.cost);
  } else {
    rows.sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0));
  }

  for (let i = 0; i < rows.length; i++) {
    (rows[i] as OptimizerRow).rank = i + 1;
  }

  return rows;
}
