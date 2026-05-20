import { backendCommand, type Rect } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import {
  buildBoardFromResults,
  type CellTier,
  isBoardSorted,
  logBoardGrid,
} from "./sushi-station-board";
import {
  SUSHI_DRAG_OPTIONS,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
} from "./sushi-station-constants";
import { planSortDrags } from "./sushi-station-sort-planner";

const log = (msg: string): void => logger.log(`sushi-station-sort - ${msg}`);

const hashBoardState = (board: CellTier[]): string =>
  [...board]
    .sort((a, b) => a.cell - b.cell)
    .map((p) => `${p.cell}:${p.tierNumber}`)
    .join("|");

export type SortResult = {
  drags: number;
  preCount: number;
  postCount: number;
  sorted: boolean;
};

// Maximum full sort passes before giving up. A pass that lands every drag
// sorts the board outright (the planner is provably correct); extra passes
// only recover from runtime drag misses (game timing dropping an input).
const MAX_SORT_PASSES = 5;

// Multi-pass planned sort: repeats up to MAX_SORT_PASSES of [scan -> full plan
// via planSortDrags (cycle decomposition: chains then pure cycles) -> execute
// every drag -> post-scan + verify], stopping as soon as the board is sorted.
//
// Each pass is atomic: the board is never re-scanned BETWEEN individual drags,
// so same-tier merges stay structurally impossible (adjacent pieces in any
// misplacement cycle/chain always have different tiers). This immunity to the
// template-miss -> same-tier-merge failure mode is why we re-plan only between
// whole passes, never mid-pass.
//
// Freeze detection: if a pass emits drags but its post-scan board hash equals
// its pre-scan hash, the game silently dropped every input - throw the
// restart-the-game error (introduced in PR #91) so the caller aborts cleanly.
//
// Non-convergence: if the board is still unsorted after MAX_SORT_PASSES (or the
// planner emits 0 drags while unsorted, which retrying cannot fix), throw so
// the caller aborts rather than proceeding on a misplaced board.
export const runPlannedSort = async (
  regions: Rect[],
  availableCells: ReadonlySet<number>,
  priorityCells: number[],
  token: CancellationToken
): Promise<SortResult> => {
  let totalDrags = 0;
  let firstPreCount: number | null = null;

  for (let pass = 1; pass <= MAX_SORT_PASSES; pass++) {
    token.throwIfCancelled();
    const preResponse = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );
    const preBoard = buildBoardFromResults(preResponse.results);
    if (firstPreCount === null) {
      firstPreCount = preBoard.length;
    }
    logBoardGrid(
      log,
      `board before sort (pass ${pass})`,
      preBoard,
      availableCells
    );
    log(`pass ${pass}: pre-sort piece count: ${preBoard.length}`);

    if (isBoardSorted(preBoard, priorityCells)) {
      log(
        pass === 1
          ? "board is already sorted, nothing to do"
          : `board sorted after ${pass - 1} pass(es)`
      );
      return {
        drags: totalDrags,
        preCount: firstPreCount,
        postCount: preBoard.length,
        sorted: true,
      };
    }

    const moves = planSortDrags(preBoard, priorityCells);
    log(`pass ${pass}: planned ${moves.length} drags`);

    if (moves.length === 0) {
      throw new Error(
        `Sushi Station sort did not converge: planner emitted 0 drags but the board is not sorted (pass ${pass}). This usually means a template misread - please restart Legends of Idleon and re-run the script.`
      );
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]!;
      log(
        `drag #${i + 1}: ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
      );
      token.throwIfCancelled();
      await backendCommand.drag(move.from, move.to, SUSHI_DRAG_OPTIONS, token);
    }
    totalDrags += moves.length;

    token.throwIfCancelled();
    const postResponse = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );
    const postBoard = buildBoardFromResults(postResponse.results);
    logBoardGrid(
      log,
      `board after sort (pass ${pass})`,
      postBoard,
      availableCells
    );
    log(`pass ${pass}: post-sort piece count: ${postBoard.length}`);

    if (postBoard.length !== preBoard.length) {
      log(
        `WARNING: piece count changed (${preBoard.length} -> ${postBoard.length}), sort caused merges`
      );
    }

    if (hashBoardState(preBoard) === hashBoardState(postBoard)) {
      throw new Error(
        `Sushi Station appears unresponsive: board state unchanged after ${moves.length} sort drags (pass ${pass}). The game may be frozen - please restart Legends of Idleon and re-run the script.`
      );
    }

    if (isBoardSorted(postBoard, priorityCells)) {
      log(`verification: board is sorted (pass ${pass})`);
      return {
        drags: totalDrags,
        preCount: firstPreCount,
        postCount: postBoard.length,
        sorted: true,
      };
    }

    const remaining = planSortDrags(postBoard, priorityCells);
    log(
      `verification: board NOT sorted after pass ${pass}, ${remaining.length} drags remain; retrying`
    );
  }

  throw new Error(
    `Sushi Station sort did not converge after ${MAX_SORT_PASSES} passes. The game is likely dropping drags - try lowering the sushi drag/click speed or restart Legends of Idleon.`
  );
};
