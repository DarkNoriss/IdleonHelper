import {
  COMPASS_NODE_DEFS,
  COMPASS_NODE_GROUPS,
} from "@/shared/compass-config";
import type { Point } from "../../../backend/backend-types";
import type { ScriptContext } from "../../define-script";

const ARROW_DOWN_MAX_ATTEMPTS = 3;
const SCROLL_IN_TIMES = 8;
const WHEEL_DELTA = 120;

export const COMPASS_CENTER: Point = { x: 539, y: 269 };

export const calibrateCompassCenter = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<Point> => {
  logger.log("Calibrating compass center from corner images...");
  const topLeft = await backend.find(
    "compass/compass_top_left",
    undefined,
    token
  );
  if (topLeft.matches.length === 0) {
    throw new Error("Compass top-left corner not found");
  }
  const bottomRight = await backend.find(
    "compass/compass_bottom_right",
    undefined,
    token
  );
  if (bottomRight.matches.length === 0) {
    throw new Error("Compass bottom-right corner not found");
  }
  const tl = topLeft.matches[0]!;
  const br = bottomRight.matches[0]!;
  const center = {
    x: Math.round((tl.x + br.x) / 2),
    y: Math.round((tl.y + br.y) / 2),
  };
  logger.log(
    `COMPASS CENTER: { x: ${center.x}, y: ${center.y} } — copy this into COMPASS_CENTER`
  );
  return center;
};

export const openCompass = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<void> => {
  logger.log("Looking for Compass skill...");
  let compassFound = false;

  const quickFindCompass = async (): Promise<boolean> => {
    if (
      await backend.isVisible("ui/attacks/attack_compass", undefined, token)
    ) {
      return backend.findAndClick(
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
        await backend.isVisible(
          "ui/attacks/attack_arrow_down",
          undefined,
          token
        )
      ) {
        await backend.findAndClick(
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
    const attacksClicked = await backend.findAndClick(
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
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"],
  center: Point
): Promise<void> => {
  logger.log(`Scrolling in ${SCROLL_IN_TIMES} times...`);
  await backend.scroll(center, WHEEL_DELTA, { times: SCROLL_IN_TIMES }, token);
};

export const findAnyNode = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<{ id: string; point: Point }> => {
  logger.log("Scanning for any visible node...");
  const maxLen = Math.max(...COMPASS_NODE_GROUPS.map((g) => g.nodes.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of COMPASS_NODE_GROUPS) {
      if (i >= group.nodes.length) {
        continue;
      }
      const node = group.nodes[i]!;
      token.throwIfCancelled();
      if (await backend.isVisible(node.image, undefined, token)) {
        const result = await backend.find(node.image, undefined, token);
        if (result.matches.length > 0) {
          logger.log(`Found node: ${node.id}`);
          return { id: node.id, point: result.matches[0]! };
        }
      }
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

export const centerNode = async (
  nodeId: string,
  center: Point,
  backend: ScriptContext["backend"],
  token: ScriptContext["token"]
): Promise<boolean> => {
  const def = COMPASS_NODE_DEFS.find((d) => d.id === nodeId);
  if (!def) {
    throw new Error(`Unknown node: ${nodeId}`);
  }
  const result = await backend.find(def.image, undefined, token);
  if (result.matches.length === 0) {
    return false;
  }
  await backend.drag(result.matches[0]!, center, { instant: true }, token);
  return true;
};

export const centerNodeOrThrow = async (
  nodeId: string,
  center: Point,
  backend: ScriptContext["backend"],
  token: ScriptContext["token"]
): Promise<void> => {
  const ok = await centerNode(nodeId, center, backend, token);
  if (!ok) {
    throw new Error(`Node "${nodeId}" not found on screen`);
  }
};

export const navigateToNode = async (
  from: string,
  to: string,
  center: Point,
  graph: Record<string, string[]>,
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"],
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
      const ok = await centerNode(path[i]!, center, backend, token);
      if (!ok) {
        lockedNodes.add(path[i]!);
        logger.log(`Node "${path[i]}" is locked, rerouting...`);
        break;
      }
      current = path[i]!;
    }
  }

  return { arrived: true, currentNode: to, locked: lockedNodes };
};
