import { randomUUID } from "node:crypto";
import type {
  EngineState,
  QueueItem,
  QueueSnapshot,
  ScriptMap,
} from "../../types/scripts";
import { setState } from "../state-hub";
import { logger } from "../utils/index";

type ScriptResolver = {
  resolve: (scriptId: keyof ScriptMap) =>
    | {
        name: string;
        recurring: boolean;
        intervalFromArgs?: (args: unknown[]) => number;
      }
    | undefined;
};

let engineState: EngineState = "idle";
let queue: QueueItem[] = [];
let resolver: ScriptResolver | null = null;

const buildSnapshot = (): QueueSnapshot => ({
  engineState,
  runningItem: queue.find((i) => i.status === "running") ?? null,
  queue: [...queue],
});

const emit = (): void => {
  setState("queue", buildSnapshot());
};

export const queueEngine = {
  setScriptResolver: (r: ScriptResolver): void => {
    resolver = r;
  },

  enqueue: (scriptId: keyof ScriptMap, args: unknown[]): { itemId: string } => {
    if (!resolver) {
      throw new Error("Queue engine: script resolver not configured");
    }
    const meta = resolver.resolve(scriptId);
    if (!meta) {
      throw new Error(`Queue engine: unknown scriptId "${String(scriptId)}"`);
    }

    const now = Date.now();
    const recurring = meta.recurring;
    const intervalMs =
      recurring && meta.intervalFromArgs
        ? meta.intervalFromArgs(args)
        : undefined;

    const item: QueueItem = {
      itemId: randomUUID(),
      scriptId,
      scriptName: meta.name,
      args,
      enqueuedAt: now,
      nextRunAt: now,
      recurring,
      intervalMs,
      status: "queued",
    };

    queue.push(item);
    logger.log(`queue: enqueued ${meta.name} (${item.itemId})`);
    emit();
    return { itemId: item.itemId };
  },

  remove: (itemId: string): void => {
    const index = queue.findIndex((i) => i.itemId === itemId);
    if (index === -1) {
      return;
    }
    const item = queue[index]!;
    // Running-item cancellation is added in Task 4. For now: remove queued only.
    if (item.status === "running") {
      logger.log(
        `queue: remove of running item ${itemId} - no-op (tick wiring pending)`
      );
      return;
    }
    queue.splice(index, 1);
    logger.log(`queue: removed ${item.scriptName} (${itemId})`);
    emit();
  },

  pause: (): void => {
    engineState = "paused";
    logger.log("queue: paused");
    emit();
  },

  resume: (): void => {
    engineState = "idle";
    logger.log("queue: resumed");
    emit();
  },

  clear: (): void => {
    const before = queue.length;
    queue = queue.filter((i) => i.status === "running");
    logger.log(`queue: cleared ${before - queue.length} item(s)`);
    emit();
  },

  get: (): QueueSnapshot => buildSnapshot(),
};
