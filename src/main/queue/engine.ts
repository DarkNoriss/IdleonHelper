import { randomUUID } from "node:crypto";
import type {
  EngineState,
  QueueItem,
  QueueSnapshot,
  ScriptMap,
} from "../../types/scripts";
import type { ScriptDescriptor } from "../scripts/define-script";
import { setState } from "../state-hub";
import {
  type CancellationToken,
  createCancellationToken,
} from "../utils/cancellation-token";
import { logger } from "../utils/index";

type ScriptResolver = {
  resolve: (scriptId: keyof ScriptMap) =>
    | {
        name: string;
        recurring: boolean;
        intervalFromArgs?: (args: unknown[]) => number;
        descriptor: ScriptDescriptor;
      }
    | undefined;
};

let engineState: EngineState = "idle";
let queue: QueueItem[] = [];
let resolver: ScriptResolver | null = null;
let currentToken: CancellationToken | null = null;
let scriptRegistry: Map<string, ScriptDescriptor> = new Map();
let tickScheduled = false;
let tickTimer: NodeJS.Timeout | null = null;

const buildSnapshot = (): QueueSnapshot => ({
  engineState,
  runningItem: queue.find((i) => i.status === "running") ?? null,
  queue: [...queue],
});

const emit = (): void => {
  setState("queue", buildSnapshot());
};

const clearTickTimer = (): void => {
  if (tickTimer) {
    clearTimeout(tickTimer);
    tickTimer = null;
  }
};

const scheduleTick = (): void => {
  if (tickScheduled) {
    return;
  }
  tickScheduled = true;
  queueMicrotask(() => {
    tickScheduled = false;
    tick().catch((error) => {
      logger.error(
        `queue: tick error - ${error instanceof Error ? error.message : String(error)}`
      );
    });
  });
};

const tick = async (): Promise<void> => {
  clearTickTimer();
  if (engineState === "paused" || engineState === "running") {
    return;
  }

  const now = Date.now();
  const readyIndex = queue.findIndex(
    (i) => i.status === "queued" && i.nextRunAt <= now
  );

  if (readyIndex === -1) {
    const future = queue
      .filter((i) => i.status === "queued")
      .map((i) => i.nextRunAt - now)
      .sort((a, b) => a - b)[0];
    if (future !== undefined && future > 0) {
      tickTimer = setTimeout(() => {
        tick().catch((error) => {
          logger.error(
            `queue: tick error - ${error instanceof Error ? error.message : String(error)}`
          );
        });
      }, future);
    }
    return;
  }

  const item = queue[readyIndex]!;
  const descriptor = scriptRegistry.get(item.scriptId);
  if (!descriptor) {
    logger.error(`queue: no descriptor for ${item.scriptId}, dropping item`);
    queue.splice(readyIndex, 1);
    emit();
    scheduleTick();
    return;
  }

  item.status = "running";
  engineState = "running";
  const token = createCancellationToken();
  currentToken = token;
  emit();
  logger.log(`queue: running ${item.scriptName}`);

  try {
    await descriptor.run({ token, args: item.args });
    logger.log(`queue: completed ${item.scriptName}`);
    finalizeItem(item, readyIndex, { cancelled: false, errorMessage: null });
  } catch (error) {
    const isCancellation =
      error instanceof Error && error.message === "Operation was cancelled";
    if (isCancellation) {
      logger.log(`queue: cancelled ${item.scriptName}`);
      finalizeItem(item, readyIndex, { cancelled: true, errorMessage: null });
    } else {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`queue: failed ${item.scriptName} - ${message}`);
      finalizeItem(item, readyIndex, {
        cancelled: false,
        errorMessage: message,
      });
    }
  } finally {
    currentToken = null;
    if (engineState === "running") {
      engineState = "idle";
    }
    emit();
    scheduleTick();
  }
};

type FinalizeOutcome = {
  cancelled: boolean;
  errorMessage: string | null;
};

const finalizeItem = (
  item: QueueItem,
  index: number,
  outcome: FinalizeOutcome
): void => {
  const stillInQueue = queue[index] === item;
  if (!stillInQueue) {
    return;
  }
  if (item.recurring && item.intervalMs !== undefined) {
    item.status = "queued";
    // Cancelled (via remove or pause): re-run ASAP on next tick.
    // Natural completion or error: schedule next cycle at now + interval.
    item.nextRunAt = outcome.cancelled
      ? Date.now()
      : Date.now() + item.intervalMs;
    item.lastError = outcome.errorMessage ?? undefined;
  } else {
    queue.splice(index, 1);
  }
};

export const queueEngine = {
  registerScripts: (scripts: ScriptDescriptor[]): void => {
    scriptRegistry = new Map(scripts.map((s) => [s.id, s]));
    resolver = {
      resolve: (scriptId) => {
        const descriptor = scriptRegistry.get(scriptId);
        if (!descriptor) {
          return undefined;
        }
        return {
          name: descriptor.name,
          recurring: descriptor.recurring,
          intervalFromArgs: descriptor.intervalFromArgs,
          descriptor,
        };
      },
    };
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
    scheduleTick();
    return { itemId: item.itemId };
  },

  remove: (itemId: string): void => {
    const index = queue.findIndex((i) => i.itemId === itemId);
    if (index === -1) {
      return;
    }
    const item = queue[index]!;
    if (item.status === "running") {
      if (currentToken) {
        currentToken.cancel();
      }
      // Finalization (remove or re-schedule recurring) happens in tick's catch.
      logger.log(`queue: cancelling running ${item.scriptName}`);
      return;
    }
    queue.splice(index, 1);
    logger.log(`queue: removed ${item.scriptName} (${itemId})`);
    emit();
    scheduleTick();
  },

  pause: (): void => {
    if (engineState === "paused") {
      return;
    }
    engineState = "paused";
    if (currentToken) {
      currentToken.cancel();
    }
    clearTickTimer();
    logger.log("queue: paused");
    emit();
  },

  resume: (): void => {
    if (engineState !== "paused") {
      return;
    }
    engineState = "idle";
    logger.log("queue: resumed");
    emit();
    scheduleTick();
  },

  clear: (): void => {
    const before = queue.length;
    queue = queue.filter((i) => i.status === "running");
    logger.log(`queue: cleared ${before - queue.length} item(s)`);
    emit();
    scheduleTick();
  },

  get: (): QueueSnapshot => buildSnapshot(),
} as const;
