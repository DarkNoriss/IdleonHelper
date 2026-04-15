import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  COMPASS_CENTER,
  centerNodeOrThrow,
  findAnyNode,
  findPath,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

const visitNode = async (
  nodeId: string,
  token: CancellationToken
): Promise<string[]> => {
  const images: Record<string, string> = {};
  for (const def of COMPASS_NODE_DEFS) {
    if (def.id === nodeId) {
      continue;
    }
    images[def.id] = def.image;
  }

  token.throwIfCancelled();
  const results = await backendCommand.isVisibleParallel(
    images,
    undefined,
    token
  );

  const neighbors: string[] = [];
  for (const [id, matches] of Object.entries(results)) {
    if (matches.length > 0) {
      neighbors.push(id);
    }
  }
  return neighbors;
};

export default defineScript({
  id: "classSpecific.compass.discoverAll",
  name: "Compass Discover All",
  run: async ({ token }) => {
    const graph: Record<string, string[]> = {};
    const visited = new Set<string>();

    await openCompass(token);
    await scrollInAtCenter(token, COMPASS_CENTER);

    const startNode = await findAnyNode(token);
    logger.log(`Starting from: ${startNode.id}`);
    await backendCommand.drag(
      startNode.point,
      COMPASS_CENTER,
      { instant: true },
      token
    );

    const startNeighbors = await visitNode(startNode.id, token);
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
        await centerNodeOrThrow(next, COMPASS_CENTER, token);
        const nextNeighbors = await visitNode(next, token);
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
        await centerNodeOrThrow(shortestPath[i]!, COMPASS_CENTER, token);
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

    logger.log(`Discover All: graph saved to ${savePath}`);
  },
});
