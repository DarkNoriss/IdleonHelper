import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";

const ARROW_DOWN_MAX_ATTEMPTS = 3;
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
  const topLeft = await backendCommand.find(
    "compass/compass_top_left",
    undefined,
    token
  );
  if (topLeft.length === 0) {
    throw new Error("Compass top-left corner not found");
  }
  const bottomRight = await backendCommand.find(
    "compass/compass_bottom_right",
    undefined,
    token
  );
  if (bottomRight.length === 0) {
    throw new Error("Compass bottom-right corner not found");
  }
  const tl = topLeft[0]!;
  const br = bottomRight[0]!;
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
  logger.log("Looking for Compass skill...");
  let compassFound = false;

  const quickFindCompass = async (): Promise<boolean> => {
    if (
      (
        await backendCommand.isVisible(
          "ui/attacks/attack_compass",
          undefined,
          token
        )
      ).length > 0
    ) {
      return backendCommand.findAndClick(
        "ui/attacks/attack_compass",
        undefined,
        token
      );
    }
    return false;
  };

  const scrollAndFindCompass = async (): Promise<boolean> => {
    for (let i = 0; i < ARROW_DOWN_MAX_ATTEMPTS; i++) {
      token.throwIfCancelled();
      logger.log(
        `Scrolling down attack bar (${i + 1}/${ARROW_DOWN_MAX_ATTEMPTS})...`
      );
      if (
        (
          await backendCommand.isVisible(
            "ui/attacks/attack_arrow_down",
            undefined,
            token
          )
        ).length > 0
      ) {
        await backendCommand.findAndClick(
          "ui/attacks/attack_arrow_down",
          undefined,
          token
        );
        const found = await quickFindCompass();
        if (found) {
          return true;
        }
      }
    }
    return false;
  };

  compassFound = await quickFindCompass();

  if (!compassFound) {
    compassFound = await scrollAndFindCompass();
  }

  if (!compassFound) {
    logger.log("Compass not found. Opening attacks bar...");
    const attacksClicked = await backendCommand.findAndClick(
      "ui/attacks/attacks",
      undefined,
      token
    );

    if (attacksClicked) {
      compassFound = await quickFindCompass();

      if (!compassFound) {
        compassFound = await scrollAndFindCompass();
      }
    }
  }

  if (!compassFound) {
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

const CENTER_TOLERANCE = 12;
const FAST_FIND = { timeoutMs: 250 };

export const centerNode = async (
  nodeId: string,
  center: Point,
  token: CancellationToken
): Promise<boolean> => {
  const def = COMPASS_NODE_DEFS.find((d) => d.id === nodeId);
  if (!def) {
    throw new Error(`Unknown node: ${nodeId}`);
  }
  const result = await backendCommand.find(def.image, FAST_FIND, token);
  if (result.length === 0) {
    return false;
  }
  await backendCommand.drag(result[0]!, center, { instant: true }, token);

  // Verify centering — re-drag if the node landed off-center
  const verify = await backendCommand.find(def.image, FAST_FIND, token);
  if (verify.length > 0) {
    const pos = verify[0]!;
    const dx = Math.abs(pos.x - center.x);
    const dy = Math.abs(pos.y - center.y);
    if (dx > CENTER_TOLERANCE || dy > CENTER_TOLERANCE) {
      await backendCommand.drag(pos, center, { instant: true }, token);
    }
  }

  await dismissPanel(token);

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

export const navigateToNode = async (
  from: string,
  to: string,
  center: Point,
  graph: Record<string, string[]>,
  token: CancellationToken,
  locked?: Set<string>
): Promise<{ arrived: boolean; currentNode: string; locked: Set<string> }> => {
  const lockedNodes = locked ?? new Set<string>();
  let current = from;

  while (current !== to) {
    token.throwIfCancelled();
    const path = findPath(current, to, graph, lockedNodes);
    if (!path) {
      return { arrived: false, currentNode: current, locked: lockedNodes };
    }

    for (let i = 1; i < path.length; i++) {
      token.throwIfCancelled();
      let ok = await centerNode(path[i]!, center, token);
      if (!ok) {
        await dismissPanel(token);
        ok = await centerNode(path[i]!, center, token);
      }
      if (!ok) {
        logger.log(`  Node "${path[i]}" is locked, rerouting...`);
        lockedNodes.add(path[i]!);
        break;
      }
      current = path[i]!;
    }
  }

  return { arrived: true, currentNode: to, locked: lockedNodes };
};
