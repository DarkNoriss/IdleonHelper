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

// Single planned-sort pass: one upfront scan, full plan via planSortDrags
// (place -> evict -> swap), execute every drag, post-scan + verify. Steps 1
// and 2 only target empty cells; step 3 swap requires explicit tier mismatch
// at the source. The board is never re-scanned mid-execution, which makes
// this immune to the template-miss -> same-tier-merge failure mode that
// rescan-between-drags loops are vulnerable to.
//
// Freeze detection: if the planner emits drags but the post-scan board hash
// equals the pre-scan hash, the game silently dropped every input. Throw the
// same restart-the-game error that the previous drain-loop variant raised
// (introduced in PR #91) so the outer HOTEW loop aborts cleanly.
export const runPlannedSort = async (
  regions: Rect[],
  availableCells: ReadonlySet<number>,
  priorityCells: number[],
  token: CancellationToken
): Promise<SortResult> => {
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
  logBoardGrid(log, "board before sort", preBoard, availableCells);
  log(`pre-sort piece count: ${preBoard.length}`);

  if (isBoardSorted(preBoard, priorityCells)) {
    log("board is already sorted, nothing to do");
    return {
      drags: 0,
      preCount: preBoard.length,
      postCount: preBoard.length,
      sorted: true,
    };
  }

  const moves = planSortDrags(preBoard, priorityCells, availableCells);
  log(`planned ${moves.length} drags`);

  if (moves.length === 0) {
    log("WARNING: planner emitted 0 drags but board is not sorted - aborting");
    return {
      drags: 0,
      preCount: preBoard.length,
      postCount: preBoard.length,
      sorted: false,
    };
  }

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]!;
    log(
      `drag #${i + 1}: ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
    );
    token.throwIfCancelled();
    await backendCommand.drag(move.from, move.to, SUSHI_DRAG_OPTIONS, token);
  }

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
  logBoardGrid(log, "board after sort", postBoard, availableCells);
  log(`post-sort piece count: ${postBoard.length}`);

  if (postBoard.length !== preBoard.length) {
    log(
      `WARNING: piece count changed (${preBoard.length} -> ${postBoard.length}), sort caused merges`
    );
  }

  if (hashBoardState(preBoard) === hashBoardState(postBoard)) {
    throw new Error(
      `Sushi Station appears unresponsive: board state unchanged after ${moves.length} sort drags. The game may be frozen - please restart Legends of Idleon and re-run the script.`
    );
  }

  const sorted = isBoardSorted(postBoard, priorityCells);
  if (sorted) {
    log("verification: board is sorted");
  } else {
    const remaining = planSortDrags(postBoard, priorityCells, availableCells);
    log(
      `verification: board NOT sorted, ${remaining.length} drags planned for next pass`
    );
  }

  return {
    drags: moves.length,
    preCount: preBoard.length,
    postCount: postBoard.length,
    sorted,
  };
};
