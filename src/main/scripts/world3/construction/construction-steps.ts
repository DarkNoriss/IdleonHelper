import { getPosition } from "../../../../parsers/construction";
import type {
  OptimalStep,
  ParsedConstructionData,
  SolverWeights,
} from "../../../../types/construction";
import {
  calculateStateScore,
  cloneInventory,
  getKeyFromPosition,
  getScoreSum,
  moveCog,
} from "./construction-utils";
import { solverLogger } from "./solver-logger";

const identityAt = (
  state: ParsedConstructionData,
  key: number
): string | null => {
  return state.cogs[key]?.cogId ?? state.slots[key]?.cogId ?? null;
};

const collectAllKeys = (...sources: Record<number, unknown>[]): Set<number> => {
  const keys = new Set<number>();
  for (const src of sources) {
    for (const k of Object.keys(src)) {
      keys.add(Number.parseInt(k, 10));
    }
  }
  return keys;
};

const buildMoveSet = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData
): Set<number> => {
  const moveSet = new Set<number>();
  const allKeys = collectAllKeys(
    initial.cogs,
    initial.slots,
    final.cogs,
    final.slots
  );
  for (const key of allKeys) {
    if (identityAt(initial, key) !== identityAt(final, key)) {
      moveSet.add(key);
    }
  }
  return moveSet;
};

const buildPermutation = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  moveSet: Set<number>
): Map<number, number> => {
  const currentByCogId = new Map<string, number>();
  const nullSources: number[] = [];
  for (const p of moveSet) {
    const id = identityAt(initial, p);
    if (id === null) {
      nullSources.push(p);
    } else {
      currentByCogId.set(id, p);
    }
  }

  const perm = new Map<number, number>();
  const claimedNullSources = new Set<number>();
  for (const p of moveSet) {
    const targetId = identityAt(final, p);
    let q: number | undefined;
    if (targetId === null) {
      for (const candidate of nullSources) {
        if (!claimedNullSources.has(candidate)) {
          q = candidate;
          claimedNullSources.add(candidate);
          break;
        }
      }
    } else {
      q = currentByCogId.get(targetId);
    }
    if (q === undefined) {
      solverLogger.error(
        `Permutation build failed at position ${p} (targetId=${targetId ?? "null"})`
      );
      return new Map();
    }
    perm.set(q, p);
  }
  return perm;
};

const decomposeCycles = (perm: Map<number, number>): number[][] => {
  const cycles: number[][] = [];
  const visited = new Set<number>();
  for (const start of perm.keys()) {
    if (visited.has(start)) {
      continue;
    }
    const cycle: number[] = [];
    let cursor = start;
    while (!visited.has(cursor)) {
      visited.add(cursor);
      cycle.push(cursor);
      const next = perm.get(cursor);
      if (next === undefined) {
        break;
      }
      cursor = next;
    }
    if (cycle.length > 1) {
      cycles.push(cycle);
    }
  }
  return cycles;
};

const cyclesToSteps = (cycles: number[][]): OptimalStep[] => {
  const steps: OptimalStep[] = [];
  for (const cycle of cycles) {
    const anchor = cycle[0];
    if (anchor === undefined) {
      continue;
    }
    for (let i = 1; i < cycle.length; i++) {
      const toKey = cycle[i];
      if (toKey === undefined) {
        continue;
      }
      const fromPos = getPosition(anchor);
      const toPos = getPosition(toKey);
      steps.push({
        from: { location: fromPos.location, x: fromPos.x, y: fromPos.y },
        to: { location: toPos.location, x: toPos.x, y: toPos.y },
      });
    }
  }
  return steps;
};

const verifySteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  steps: OptimalStep[],
  weights: SolverWeights
): boolean => {
  const verify = cloneInventory(initial);
  for (const step of steps) {
    const fromKey = getKeyFromPosition(
      step.from.location,
      step.from.x,
      step.from.y
    );
    const toKey = getKeyFromPosition(step.to.location, step.to.x, step.to.y);
    moveCog(verify, fromKey, toKey);
  }

  const allKeys = collectAllKeys(
    verify.cogs,
    verify.slots,
    final.cogs,
    final.slots
  );

  const mismatches: { key: number; verify: string; final: string }[] = [];
  for (const key of allKeys) {
    const verifyId = identityAt(verify, key);
    const finalId = identityAt(final, key);
    if (verifyId !== finalId) {
      mismatches.push({
        key,
        verify: verifyId ?? "empty",
        final: finalId ?? "empty",
      });
    }
  }

  if (mismatches.length > 0) {
    solverLogger.error(
      `Step verification failed - ${mismatches.length} mismatches`
    );
    for (const m of mismatches.slice(0, 10)) {
      solverLogger.error(
        `  Key ${m.key}: verify=[${m.verify}], final=[${m.final}]`
      );
    }
    return false;
  }

  verify.score = calculateStateScore(verify);
  if (verify.score && final.score) {
    const verifyScore = getScoreSum(verify.score, weights);
    const finalScore = getScoreSum(final.score, weights);
    if (verifyScore !== finalScore) {
      solverLogger.warn(
        `Verified board matches but score differs - verify=${verifyScore.toFixed(2)} final=${finalScore.toFixed(2)} (treating as float drift)`
      );
    }
  }

  return true;
};

export const getOptimalSteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  weights: SolverWeights
): OptimalStep[] => {
  const moveSet = buildMoveSet(initial, final);
  if (moveSet.size === 0) {
    return [];
  }

  const perm = buildPermutation(initial, final, moveSet);
  if (perm.size === 0) {
    return [];
  }

  const cycles = decomposeCycles(perm);
  const steps = cyclesToSteps(cycles);

  if (!verifySteps(initial, final, steps, weights)) {
    solverLogger.error(
      "Aborting - generated steps do not reproduce optimized board"
    );
    return [];
  }

  return steps;
};
