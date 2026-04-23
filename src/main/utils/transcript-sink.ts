import {
  chmodSync,
  createWriteStream,
  mkdirSync,
  type WriteStream,
} from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { subscribeToEntries } from "./logger";
import type { RunContextStore } from "./run-context";

const MAX_KEPT_RUNS = 100;

let runsDir: string | null = null;
const streams = new Map<string, WriteStream>();
let subscribed = false;

const getRunsDir = (): string => {
  if (!runsDir) {
    runsDir = path.join(app.getPath("userData"), "logs", "runs");
    mkdirSync(runsDir, { recursive: true });
  }
  return runsDir;
};

const getStream = (runId: string): WriteStream => {
  const existing = streams.get(runId);
  if (existing) {
    return existing;
  }
  const filePath = path.join(getRunsDir(), `${runId}.jsonl`);
  const stream = createWriteStream(filePath, { flags: "a" });
  streams.set(runId, stream);
  return stream;
};

const writeLine = (runId: string, obj: Record<string, unknown>): void => {
  getStream(runId).write(`${JSON.stringify(obj)}\n`);
};

export const transcriptPathFor = (runId: string): string =>
  path.join(getRunsDir(), `${runId}.jsonl`);

export const beginRun = (ctx: RunContextStore, args: unknown[]): void => {
  writeLine(ctx.runId, {
    t: ctx.startedAt,
    phase: "start",
    runId: ctx.runId,
    scriptId: ctx.scriptId,
    scriptName: ctx.scriptName,
    args,
  });
};

export const endRun = (
  ctx: RunContextStore,
  outcome: "completed" | "failed" | "cancelled",
  error?: string
): void => {
  const now = Date.now();
  writeLine(ctx.runId, {
    t: now,
    phase: "end",
    runId: ctx.runId,
    scriptId: ctx.scriptId,
    outcome,
    durationMs: now - ctx.startedAt,
    error,
  });
  const stream = streams.get(ctx.runId);
  if (stream) {
    stream.end();
    streams.delete(ctx.runId);
  }
};

export const initTranscriptSink = (): void => {
  if (subscribed) {
    return;
  }
  subscribed = true;
  subscribeToEntries((entry) => {
    if (!entry.runId) {
      return;
    }
    writeLine(entry.runId, {
      t: entry.timestamp,
      phase: "log",
      runId: entry.runId,
      scriptId: entry.scriptId,
      level: entry.level,
      message: entry.message,
    });
  });
};

export const pruneOldTranscripts = async (): Promise<void> => {
  const dir = getRunsDir();
  const files = await readdir(dir);
  const withStats = await Promise.all(
    files
      .filter((f) => f.endsWith(".jsonl"))
      .map(async (name) => {
        const full = path.join(dir, name);
        const s = await stat(full);
        return { full, mtime: s.mtimeMs };
      })
  );
  withStats.sort((a, b) => b.mtime - a.mtime);
  const toDelete = withStats.slice(MAX_KEPT_RUNS);
  await Promise.all(toDelete.map((e) => unlink(e.full).catch(() => undefined)));
};

export const restrictFilePerms = (filePath: string): void => {
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Best effort on Windows.
  }
};
