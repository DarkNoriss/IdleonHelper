import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import type { ScriptContext } from "../../define-script";
import { defineScript } from "../../define-script";
import {
  centerNodeOrThrow,
  findAnyNode,
  findCompassCenter,
  findPath,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

const visitNode = async (
  nodeId: string,
  backend: ScriptContext["backend"],
  token: ScriptContext["token"]
): Promise<string[]> => {
  const neighbors: string[] = [];
  for (const def of COMPASS_NODE_DEFS) {
    if (def.id === nodeId) {
      continue;
    }
    token.throwIfCancelled();
    const visible = await backend.isVisible(def.image, undefined, token);
    if (visible) {
      neighbors.push(def.id);
    }
  }
  return neighbors;
};

export default defineScript({
  id: "classSpecific.compass.discoverAll",
  name: "Compass Discover All",
  run: async ({ token, backend, logger }) => {
    const graph: Record<string, string[]> = {};
    const visited = new Set<string>();

    await openCompass(backend, token, logger);
    const center = await findCompassCenter(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, center);

    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Starting from: ${startNode.id}`);
    await backend.drag(startNode.point, center, { instant: true }, token);

    const startNeighbors = await visitNode(startNode.id, backend, token);
    graph[startNode.id] = startNeighbors;
    visited.add(startNode.id);
    let currentId = startNode.id;

    logger.log(
      `[1/${COMPASS_NODE_DEFS.length}] ${startNode.id} -> [${startNeighbors.join(", ")}]`
    );

    while (visited.size < COMPASS_NODE_DEFS.length) {
      token.throwIfCancelled();

      const neighbors = graph[currentId] ?? [];
      const next = neighbors.find((n) => !visited.has(n));

      if (next) {
        await centerNodeOrThrow(next, center, backend, token);
        const nextNeighbors = await visitNode(next, backend, token);
        graph[next] = nextNeighbors;
        visited.add(next);
        currentId = next;

        logger.log(
          `[${visited.size}/${COMPASS_NODE_DEFS.length}] ${next} -> [${nextNeighbors.join(", ")}]`
        );
        continue;
      }

      let backtrackTarget: string | null = null;
      let shortestPath: string[] | null = null;

      for (const [nodeId, nodeNeighbors] of Object.entries(graph)) {
        if (nodeNeighbors.some((n) => !visited.has(n))) {
          const path = findPath(currentId, nodeId, graph);
          if (path && (!shortestPath || path.length < shortestPath.length)) {
            backtrackTarget = nodeId;
            shortestPath = path;
          }
        }
      }

      if (!(backtrackTarget && shortestPath)) {
        break;
      }

      for (let i = 1; i < shortestPath.length; i++) {
        await centerNodeOrThrow(shortestPath[i]!, center, backend, token);
      }
      currentId = backtrackTarget;
    }

    const unreachable = COMPASS_NODE_DEFS.filter((d) => !visited.has(d.id)).map(
      (d) => d.id
    );
    if (unreachable.length > 0) {
      logger.log(`Unreachable nodes: [${unreachable.join(", ")}]`);
    }

    const savePath = join(
      process.cwd(),
      "resources",
      "assets",
      "compass",
      "graph.json"
    );
    writeFileSync(savePath, JSON.stringify(graph, null, 2));

    logger.log(`Graph saved to ${savePath}`);
    logger.log(JSON.stringify(graph, null, 2));
  },
});
