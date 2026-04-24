import { parentPort } from "node:worker_threads";
import type {
  SolverWorkerEvent,
  SolverWorkerMessage,
} from "../../types/construction";
import { solver } from "../scripts/world3/construction/construction-solver";
import { setSolverLogger } from "../scripts/world3/construction/solver-logger";

if (!parentPort) {
  throw new Error(
    "construction-solver.worker must be spawned via worker_threads"
  );
}

const port = parentPort;

const post = (event: SolverWorkerEvent): void => {
  port.postMessage(event);
};

setSolverLogger({
  log: (message) => post({ type: "log", level: "log", message }),
  info: (message) => post({ type: "log", level: "info", message }),
  warn: (message) => post({ type: "log", level: "warn", message }),
  error: (message) => post({ type: "log", level: "error", message }),
});

let cancelled = false;

port.on("message", async (msg: SolverWorkerMessage) => {
  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }

  if (msg.type === "solve") {
    try {
      const result = await solver(msg.data, msg.weights, msg.solveTimeMs, {
        shouldCancel: () => cancelled,
        onProgress: (progress) => post({ type: "progress", progress }),
      });
      post({ type: "done", result });
    } catch (err) {
      const e = err as Error;
      post({ type: "error", message: e.message, stack: e.stack });
    }
  }
});
