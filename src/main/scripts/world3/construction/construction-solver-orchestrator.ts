import path from "node:path";
import { Worker } from "node:worker_threads";
import type {
  ParsedConstructionData,
  SolverResult,
  SolverWeights,
  SolverWorkerEvent,
  SolverWorkerMessage,
} from "../../../../types/construction";
import { setState } from "../../../state-hub";
import { logger } from "../../../utils/index";

const WORKER_RELATIVE_PATH = "workers/construction-solver.worker.js";
const HARD_CANCEL_TIMEOUT_MS = 2000;

let activeRun: {
  worker: Worker;
  cancel: () => void;
} | null = null;

export const cancelSolver = (): void => {
  activeRun?.cancel();
};

export const solve = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTimeMs: number
): Promise<SolverResult | null> => {
  if (activeRun) {
    throw new Error("Solver is already running");
  }

  const workerPath = path.join(import.meta.dirname, WORKER_RELATIVE_PATH);
  const worker = new Worker(workerPath);

  setState("constructionSolver", { progress: null });

  return await new Promise<SolverResult | null>((resolve, reject) => {
    let settled = false;
    let hardCancelTimer: NodeJS.Timeout | null = null;

    const settleOnce = (
      kind: "resolve" | "reject",
      value: SolverResult | null | Error
    ): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (hardCancelTimer) {
        clearTimeout(hardCancelTimer);
        hardCancelTimer = null;
      }
      activeRun = null;
      setState("constructionSolver", { progress: null });
      worker.terminate();
      if (kind === "resolve") {
        resolve(value as SolverResult | null);
      } else {
        reject(value as Error);
      }
    };

    const cancel = (): void => {
      if (settled) {
        return;
      }
      try {
        worker.postMessage({ type: "cancel" } satisfies SolverWorkerMessage);
      } catch (err) {
        logger.error(
          `Failed to send cancel to solver worker: ${(err as Error).message}`
        );
      }
      hardCancelTimer = setTimeout(() => {
        if (!settled) {
          logger.warn("Solver soft-cancel timed out; hard-terminating worker");
          settleOnce("resolve", null);
        }
      }, HARD_CANCEL_TIMEOUT_MS);
    };

    activeRun = { worker, cancel };

    worker.on("message", (event: SolverWorkerEvent) => {
      if (event.type === "progress") {
        setState("constructionSolver", { progress: event.progress });
        return;
      }
      if (event.type === "done") {
        settleOnce("resolve", event.result);
        return;
      }
      if (event.type === "error") {
        settleOnce("reject", new Error(event.message));
        return;
      }
      if (event.type === "log") {
        logger[event.level](event.message);
      }
    });

    worker.on("error", (err) => {
      settleOnce("reject", err);
    });

    worker.on("exit", (code) => {
      if (!settled) {
        settleOnce(
          "reject",
          new Error(`Solver worker exited unexpectedly with code ${code}`)
        );
      }
    });

    worker.postMessage({
      type: "solve",
      data: inventory,
      weights,
      solveTimeMs,
    } satisfies SolverWorkerMessage);
  });
};
