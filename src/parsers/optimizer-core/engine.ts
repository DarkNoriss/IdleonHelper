import type { ComputePathInput, GateFn, OptimizerStep } from "./types";

/**
 * Greedy steepest-ascent optimizer.
 *
 * Each iteration: filter slots through `gates`, keep slots with positive
 * gain and finite cost, pick the one with highest `gain / scoreInput`.
 * Tie-break: lower slot index wins (deterministic across refactors).
 *
 * For "all (cheapest)" mode, callers pass `gain: () => null` and
 * `score: () => cost`; the engine treats null gain as "non-metric mode"
 * and ranks by lowest cost ascending instead of highest efficiency.
 */
export function computePath<TState>(
  input: ComputePathInput<TState>
): OptimizerStep[] {
  const {
    initialState,
    slotCount,
    maxSteps,
    score,
    gain,
    apply,
    gates,
    resourceOf,
    nameOf,
    fromLevel,
  } = input;

  let state = initialState;
  const steps: OptimizerStep[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    let bestSlot = -1;
    let bestCost = 0;
    let bestResourceId = "";
    let bestGain: number | null = null;
    let bestScoreInput = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let slot = 0; slot < slotCount; slot++) {
      // Run gates left-to-right; first failing gate wins.
      let gated = false;
      for (const gate of gates) {
        const r = gate(slot, state);
        if (!r.ok) {
          gated = true;
          break;
        }
      }
      if (gated) {
        continue;
      }

      const scoreInput = score(slot, state);
      if (!Number.isFinite(scoreInput) || scoreInput <= 0) {
        continue;
      }

      const g = gain(slot, state);
      let candidateScore: number;
      if (g === null) {
        // Non-metric mode: cheapest first.
        candidateScore = -scoreInput;
      } else {
        if (!Number.isFinite(g) || g <= 0) {
          continue;
        }
        candidateScore = g / scoreInput;
      }

      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestSlot = slot;
        const r = resourceOf(slot, state);
        bestCost = r.cost;
        bestResourceId = r.id;
        bestGain = g;
        bestScoreInput = scoreInput;
      }
    }

    if (bestSlot === -1) {
      break;
    }

    const from = fromLevel(bestSlot, state);
    state = apply(bestSlot, state);
    const to = fromLevel(bestSlot, state);

    steps.push({
      rank: step,
      slot: bestSlot,
      name: nameOf(bestSlot),
      fromLevel: from,
      toLevel: to,
      cost: bestCost,
      resourceId: bestResourceId,
      gain: bestGain,
      efficiency: bestGain === null ? null : bestGain / bestScoreInput,
    });
  }

  return steps;
}

// --- Built-in gates (composable across phases) -----------------------------

export function maxedGate<TState>(
  getLevel: (slot: number, s: TState) => number,
  getMaxLevel: (slot: number, s: TState) => number,
  treatAsInfiniteIfAtLeast = Number.POSITIVE_INFINITY
): GateFn<TState> {
  return (slot, state) => {
    const lv = getLevel(slot, state);
    const max = getMaxLevel(slot, state);
    if (lv >= max && max < treatAsInfiniteIfAtLeast) {
      return { ok: false, reason: "maxed" };
    }
    return { ok: true };
  };
}

export function affordabilityGate<TState>(
  enabled: () => boolean,
  canAfford: (slot: number, s: TState) => boolean
): GateFn<TState> {
  return (slot, state) => {
    if (!enabled()) {
      return { ok: true };
    }
    return canAfford(slot, state)
      ? { ok: true }
      : { ok: false, reason: "unaffordable" };
  };
}
