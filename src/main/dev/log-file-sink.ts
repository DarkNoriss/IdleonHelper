import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import path from "node:path";
import { app } from "electron";
import {
  getLogs,
  type LogEntry,
  logger,
  subscribeToEntries,
} from "../utils/index";

const LOG_FILE_NAME = "idleon-helper.log";

let stream: WriteStream | null = null;
let unsubscribe: (() => void) | null = null;

const formatEntry = (entry: LogEntry): string => {
  const timestamp = new Date(entry.timestamp).toISOString();
  const level = entry.level.toUpperCase();
  const scriptId = entry.scriptId ?? "global";
  return `[${timestamp}] [${level}] [${scriptId}] ${entry.message}\n`;
};

export const startLogFileSink = (): void => {
  if (stream) {
    return;
  }

  try {
    const logFilePath = path.join(app.getAppPath(), "logs", LOG_FILE_NAME);
    mkdirSync(path.dirname(logFilePath), { recursive: true });

    const writeStream = createWriteStream(logFilePath, { flags: "w" });
    writeStream.on("error", (error) => {
      stopLogFileSink();
      logger.error(`Log file sink stream error - ${error.message}`);
    });

    stream = writeStream;

    for (const entry of getLogs()) {
      writeStream.write(formatEntry(entry));
    }

    unsubscribe = subscribeToEntries((entry) => {
      writeStream.write(formatEntry(entry));
    });

    logger.log(`Dev log file sink started - ${logFilePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stopLogFileSink();
    logger.error(`Log file sink startup failed - ${message}`);
  }
};

export const stopLogFileSink = (): void => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (stream) {
    stream.end();
    stream = null;
  }
};
