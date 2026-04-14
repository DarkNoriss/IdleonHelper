import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import type { Point } from "../../../backend/backend-types";
import {
  backendCommand,
  getDragOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { navigation } from "../../game-nav/index";

const SCROLL_IN_TIMES = 8;
export const WHEEL_DELTA = 120;

export const COMPASS_CENTER: Point = { x: 539, y: 269 };

const DISMISS_PANEL_MAX_ATTEMPTS = 10;

export const dismissPanel = async (
  token: CancellationToken
): Promise<boolean> => {
  for (let attempt = 0; attempt < DISMISS_PANEL_MAX_ATTEMPTS; attempt++) {
    const hasCost = await backendCommand.isVisible(
      "compass/compass_cost",
      undefined,
      token
    );
    if (hasCost.length === 0) {
      return true;
    }
    await backendCommand.findAndClick("compass/compass", undefined, token);
  }
  return false;
};

export const loadGraph = (): Record<string, string[]> => {
  const graphPath = join(
    process.cwd(),
    "resources",
    "assets",
    "compass",
    "graph.json"
  );
  return JSON.parse(readFileSync(graphPath, "utf-8")) as Record<
    string,
    string[]
  >;
};

export const calibrateCompassCenter = async (
  token: CancellationToken
): Promise<Point> => {
  logger.log("Calibrating compass center from corner images...");
  const corners = await backendCommand.findParallel(
    {
      topLeft: "compass/compass_top_left",
      bottomRight: "compass/compass_bottom_right",
    },
    undefined,
    token
  );
  if (corners.topLeft!.length === 0) {
    throw new Error("Compass top-left corner not found");
  }
  if (corners.bottomRight!.length === 0) {
    throw new Error("Compass bottom-right corner not found");
  }
  const tl = corners.topLeft![0]!;
  const br = corners.bottomRight![0]!;
  const center = {
    x: Math.round((tl.x + br.x) / 2),
    y: Math.round((tl.y + br.y) / 2),
  };
  logger.log(
    `Compass center: (${center.x}, ${center.y}) -> copy this into COMPASS_CENTER`
  );
  return center;
};

export const openCompass = async (token: CancellationToken): Promise<void> => {
  const clicked = await navigation.findAttackSkill(
    "ui/attacks/attack_compass",
    token,
    "Compass"
  );
  if (!clicked) {
    throw new Error("Compass skill not found on attack bar");
  }
};

export const scrollInAtCenter = async (
  token: CancellationToken,
  center: Point
): Promise<void> => {
  logger.log(`Scrolling in ${SCROLL_IN_TIMES} times...`);
  await backendCommand.scroll(
    center,
    WHEEL_DELTA,
    { times: SCROLL_IN_TIMES },
    token
  );
};

export const findAnyNode = async (
  token: CancellationToken
): Promise<{ id: string; point: Point }> => {
  logger.log("Scanning for any visible node...");

  const images: Record<string, string> = {};
  for (const def of COMPASS_NODE_DEFS) {
    images[def.id] = def.image;
  }

  token.throwIfCancelled();
  const results = await backendCommand.isVisibleParallel(
    images,
    undefined,
    token
  );

  for (const [id, matches] of Object.entries(results)) {
    if (matches.length > 0) {
      logger.log(`Found node: ${id}`);
      return { id, point: matches[0]! };
    }
  }

  throw new Error("No compass node found on screen");
};

export const findPath = (
  from: string,
  to: string,
  graph: Record<string, string[]>,
  exclude?: Set<string>
): string[] | null => {
  if (from === to) {
    return [from];
  }
  const queue: string[][] = [[from]];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    for (const neighbor of graph[current] ?? []) {
      if (exclude?.has(neighbor)) {
        continue;
      }
      if (neighbor === to) {
        return [...path, neighbor];
      }
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
};

const CENTER_TOLERANCE = 16;
const FAST_FIND = { timeoutMs: 250 };

export const centerNode = async (
  nodeId: string,
  center: Point,
  token: CancellationToken,
  opts?: { quiet?: boolean }
): Promise<boolean> => {
  const quiet = opts?.quiet ?? false;
  const def = COMPASS_NODE_DEFS.find((d) => d.id === nodeId);
  if (!def) {
    throw new Error(`Unknown node: ${nodeId}`);
  }
  const result = await backendCommand.find(
    def.image,
    { ...FAST_FIND, threshold: 0.9 },
    token
  );
  if (result.length === 0) {
    if (!quiet) {
      logger.log(`    "${nodeId}" not visible within ${FAST_FIND.timeoutMs}ms`);
    }
    return false;
  }
  await backendCommand.drag(
    result[0]!,
    center,
    { ...getDragOptionsFromPreset("2x"), instant: true },
    token
  );

  // Verify centering — re-drag if the node landed off-center
  const verify = await backendCommand.find(
    def.image,
    { timeoutMs: FAST_FIND.timeoutMs, threshold: 0.9 },
    token
  );
  if (verify.length > 0) {
    const pos = verify[0]!;
    const dx = Math.abs(pos.x - center.x);
    const dy = Math.abs(pos.y - center.y);
    if (dx > CENTER_TOLERANCE || dy > CENTER_TOLERANCE) {
      if (!quiet) {
        logger.log(`    "${nodeId}" off-center by (${dx}, ${dy}), re-dragging`);
      }
      await backendCommand.drag(
        pos,
        center,
        { ...getDragOptionsFromPreset("8x"), instant: true },
        token
      );
    }
  }

  // const dismissed = await dismissPanel(token);
  // if (!(dismissed || quiet)) {
  //   logger.log(`    "${nodeId}" panel did not dismiss cleanly`);
  // }

  return true;
};

export const centerNodeOrThrow = async (
  nodeId: string,
  center: Point,
  token: CancellationToken
): Promise<void> => {
  const ok = await centerNode(nodeId, center, token);
  if (!ok) {
    throw new Error(`Node "${nodeId}" not found on screen`);
  }
};

const formatAttempt = (path: string[], failedAt?: string): string => {
  if (!failedAt) {
    return path.join(" -> ");
  }
  return path.map((n) => (n === failedAt ? `[${n}]` : n)).join(" -> ");
};

export const navigateToNode = async (
  from: string,
  to: string,
  center: Point,
  graph: Record<string, string[]>,
  token: CancellationToken,
  opts?: { quiet?: boolean }
): Promise<{ arrived: boolean; currentNode: string; locked: Set<string> }> => {
  const quiet = opts?.quiet ?? false;
  const lockedNodes = new Set<string>();
  const attempts: { path: string[]; failedAt?: string }[] = [];
  let current = from;

  if (!quiet) {
    logger.log(`Navigating: "${current}" -> "${to}"`);
  }

  while (current !== to) {
    token.throwIfCancelled();
    const path = findPath(current, to, graph, lockedNodes);
    if (!path) {
      if (quiet) {
        for (const a of attempts) {
          logger.log(`  Tried: ${formatAttempt(a.path, a.failedAt)}`);
        }
      }
      logger.error(
        `  No path from "${current}" to "${to}" - locked: [${[...lockedNodes].join(", ") || "none"}]`
      );
      return { arrived: false, currentNode: current, locked: lockedNodes };
    }

    const attempt: { path: string[]; failedAt?: string } = { path: [...path] };
    attempts.push(attempt);

    const hops = path.length - 1;
    if (!quiet) {
      logger.log(`  Route (${hops} hops): ${path.join(" -> ")}`);
    }

    for (let i = 1; i < path.length; i++) {
      token.throwIfCancelled();
      const nextNode = path[i]!;
      if (!quiet) {
        logger.log(`  Hop ${i}/${hops}: "${current}" -> "${nextNode}"`);
      }

      let ok = await centerNode(nextNode, center, token, { quiet });
      if (!ok) {
        if (!quiet) {
          logger.log(`    Retry after dismissPanel for "${nextNode}"`);
        }
        await delay(200, token);

        await dismissPanel(token);
        ok = await centerNode(nextNode, center, token, { quiet });
      }
      if (!ok) {
        attempt.failedAt = nextNode;
        if (!quiet) {
          logger.log(
            `    "${nextNode}" unreachable from "${current}" (image not found - locked or off-screen). Rerouting...`
          );
        }
        lockedNodes.add(nextNode);
        break;
      }
      current = nextNode;
    }
  }

  if (!quiet) {
    logger.log(`Arrived at "${to}"`);
  }
  return { arrived: true, currentNode: to, locked: lockedNodes };
};
