import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import type { Point } from "../../../backend/backend-types";
import type { ScriptContext } from "../../define-script";
import { defineScript } from "../../define-script";
import {
  findAnyNode,
  findCompassCenter,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

const loadGraph = (): Record<string, string[]> => {
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

const findPath = (
  from: string,
  to: string,
  graph: Record<string, string[]>
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

const centerNode = async (
  nodeId: string,
  center: Point,
  backend: ScriptContext["backend"],
  token: ScriptContext["token"]
) => {
  const def = COMPASS_NODE_DEFS.find((d) => d.id === nodeId);
  if (!def) {
    throw new Error(`Unknown node: ${nodeId}`);
  }
  const result = await backend.find(def.image, undefined, token);
  if (result.matches.length === 0) {
    throw new Error(`Node "${nodeId}" not found on screen`);
  }
  await backend.drag(result.matches[0]!, center, { instant: true }, token);
};

export default defineScript<[string]>({
  id: "classSpecific.compass.minorDebug",
  name: "Compass Minor Debug",
  run: async ({ token, backend, logger, args: [nodeId] }) => {
    const targetDef = COMPASS_NODE_DEFS.find((d) => d.id === nodeId);
    if (!targetDef) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const minorNodes = targetDef.minorNodes ?? [];
    if (minorNodes.length === 0) {
      logger.log(`Node "${nodeId}" has no minor nodes defined`);
      return;
    }

    const graph = loadGraph();

    await openCompass(backend, token, logger);
    const center = await findCompassCenter(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, center);

    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Found start node: ${startNode.id}`);
    await backend.drag(startNode.point, center, { instant: true }, token);

    if (startNode.id !== nodeId) {
      const path = findPath(startNode.id, nodeId, graph);
      if (!path) {
        throw new Error(
          `No path from "${startNode.id}" to "${nodeId}" in graph`
        );
      }
      logger.log(`Navigating: ${path.join(" → ")}`);
      for (let i = 1; i < path.length; i++) {
        await centerNode(path[i]!, center, backend, token);
      }
    }

    logger.log(`Centered on: ${nodeId}`);
    logger.log(`Compass center: (${center.x}, ${center.y})`);
    logger.log(`Scanning ${minorNodes.length} minor node images...`);

    const scannedImages = new Set<string>();
    for (const minor of minorNodes) {
      if (scannedImages.has(minor.image)) {
        continue;
      }
      scannedImages.add(minor.image);

      token.throwIfCancelled();
      logger.log(`\nfindWithDebug: ${minor.image}`);
      const result = await backend.findWithDebug(minor.image, undefined, token);

      if (result.debugImagePath) {
        logger.log(`Debug image: ${result.debugImagePath}`);
      }

      if (result.matches.length === 0) {
        logger.log("  No matches found");
      } else {
        for (const match of result.matches) {
          const offsetX = match.point.x - center.x;
          const offsetY = match.point.y - center.y;
          logger.log(
            `  Match: (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(3)} offset=({x: ${offsetX}, y: ${offsetY}})`
          );
        }
      }
    }

    logger.log("\nMinor debug finished");
  },
});
