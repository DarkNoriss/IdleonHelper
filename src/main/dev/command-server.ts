import { randomBytes, timingSafeEqual } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { app } from "electron";
import type { ScriptMap } from "../../types/scripts";
import { queueEngine } from "../queue/index";
import { setState } from "../state-hub";
import { logger, restrictFilePerms, transcriptPathFor } from "../utils/index";
import { panicExit } from "./panic-exit";

type RegisteredScript = { id: string; name: string; recurring: boolean };

const DEAD_MAN_MS = 10 * 60 * 1000;
const DEAD_MAN_CHECK_MS = 60 * 1000;

let server: Server | null = null;
let token: string | null = null;
let port: number | null = null;
let lastActivityAt = Date.now();
let deadManTimer: NodeJS.Timeout | null = null;
let registeredScripts: RegisteredScript[] = [];

const tokenFile = (): string => path.join(app.getPath("userData"), "dev-token");
const portFile = (): string => path.join(app.getPath("userData"), "dev-port");

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const authorized = (req: IncomingMessage): boolean => {
  if (!token) {
    return false;
  }
  const header = req.headers.authorization ?? "";
  const expected = `Bearer ${token}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};

const touchActivity = (): void => {
  lastActivityAt = Date.now();
};

const startDeadManTimer = (): void => {
  if (deadManTimer) {
    clearInterval(deadManTimer);
  }
  deadManTimer = setInterval(() => {
    const idleMs = Date.now() - lastActivityAt;
    if (idleMs > DEAD_MAN_MS) {
      logger.warn(
        `dev: dead-man triggered after ${Math.floor(idleMs / 1000)}s of inactivity`
      );
      panicExit();
      lastActivityAt = Date.now();
    }
  }, DEAD_MAN_CHECK_MS);
};

const handle = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const p = url.pathname;
  const method = req.method ?? "GET";

  if (p === "/health" && method === "GET") {
    touchActivity();
    json(res, 200, {
      ok: true,
      port,
      appVersion: app.getVersion(),
    });
    return;
  }

  if (!authorized(req)) {
    json(res, 401, {});
    return;
  }
  touchActivity();

  if (p === "/scripts" && method === "GET") {
    json(res, 200, registeredScripts);
    return;
  }

  if (p === "/run" && method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      scriptId: string;
      args?: unknown[];
    };
    const { itemId } = queueEngine.enqueue(
      body.scriptId as keyof ScriptMap,
      body.args ?? []
    );
    json(res, 200, { itemId, transcriptPath: transcriptPathFor(itemId) });
    return;
  }

  const cancelMatch = p.match(/^\/cancel\/([^/]+)$/);
  if (cancelMatch && method === "POST") {
    const itemId = cancelMatch[1]!;
    const snapshot = queueEngine.get();
    const exists =
      snapshot.queue.some((i) => i.itemId === itemId) ||
      snapshot.runningItem?.itemId === itemId;
    queueEngine.remove(itemId);
    json(res, 200, { cancelled: exists });
    return;
  }

  if (p === "/panic" && method === "POST") {
    json(res, 200, panicExit());
    return;
  }

  if (p === "/status" && method === "GET") {
    json(res, 200, queueEngine.get());
    return;
  }

  const runMatch = p.match(/^\/runs\/([^/]+)$/);
  if (runMatch && method === "GET") {
    const itemId = runMatch[1]!;
    try {
      const contents = await readFile(transcriptPathFor(itemId), "utf8");
      res.writeHead(200, { "Content-Type": "application/x-ndjson" });
      res.end(contents);
    } catch {
      json(res, 404, { error: "transcript not found" });
    }
    return;
  }

  json(res, 404, { error: "not found" });
};

export const startDevServer = (scripts: RegisteredScript[]): void => {
  registeredScripts = scripts;
  token = randomBytes(32).toString("hex");
  server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`dev: unhandled request error - ${message}`);
      try {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      } catch {
        // Response already written.
      }
    });
  });
  server.listen(0, "127.0.0.1", () => {
    const addr = server?.address();
    if (addr && typeof addr === "object") {
      port = addr.port;
      writeFileSync(tokenFile(), token ?? "", { mode: 0o600 });
      restrictFilePerms(tokenFile());
      writeFileSync(portFile(), String(port));
      setState("devServer", { port, armed: true });
      logger.log(`dev: command server listening on 127.0.0.1:${port}`);
      startDeadManTimer();
    }
  });
};

export const stopDevServer = (): void => {
  if (deadManTimer) {
    clearInterval(deadManTimer);
    deadManTimer = null;
  }
  try {
    unlinkSync(tokenFile());
  } catch {
    // May not exist.
  }
  try {
    unlinkSync(portFile());
  } catch {
    // May not exist.
  }
  server?.close();
  server = null;
  token = null;
  port = null;
  setState("devServer", { port: null, armed: false });
};
