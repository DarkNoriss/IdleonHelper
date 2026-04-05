import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMPASS_NODE_DEFS } from "../../../../types/compass";
import type { Point } from "../../../backend/backend-types";
import type { ScriptContext } from "../../define-script";
import { defineScript } from "../../define-script";
import {
  findCompassCenter,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

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

    // Find and center pathfinder
    logger.log("Centering pathfinder...");
    const pathfinder = await backend.find(
      "compass/compass_pathfinder",
      undefined,
      token
    );
    if (pathfinder.matches.length === 0) {
      throw new Error("Pathfinder not found");
    }
    await backend.drag(
      pathfinder.matches[0]!,
      center,
      { instant: true },
      token
    );

    // Visit pathfinder
    const pathfinderNeighbors = await visitNode("pathfinder", backend, token);
    graph.pathfinder = pathfinderNeighbors;
    visited.add("pathfinder");
    let currentId = "pathfinder";

    logger.log(
      `[1/${COMPASS_NODE_DEFS.length}] pathfinder -> [${pathfinderNeighbors.join(", ")}]`
    );

    // DFS traversal
    while (visited.size < COMPASS_NODE_DEFS.length) {
      token.throwIfCancelled();

      // Try unvisited neighbor of current node
      const neighbors = graph[currentId] ?? [];
      const next = neighbors.find((n) => !visited.has(n));

      if (next) {
        await centerNode(next, center, backend, token);
        const nextNeighbors = await visitNode(next, backend, token);
        graph[next] = nextNeighbors;
        visited.add(next);
        currentId = next;

        logger.log(
          `[${visited.size}/${COMPASS_NODE_DEFS.length}] ${next} -> [${nextNeighbors.join(", ")}]`
        );
        continue;
      }

      // Backtrack: find nearest visited node with unvisited neighbors
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

      // Navigate through known path
      for (let i = 1; i < shortestPath.length; i++) {
        await centerNode(shortestPath[i]!, center, backend, token);
      }
      currentId = backtrackTarget;
    }

    // Report unreachable nodes
    const unreachable = COMPASS_NODE_DEFS.filter((d) => !visited.has(d.id)).map(
      (d) => d.id
    );
    if (unreachable.length > 0) {
      logger.log(`Unreachable nodes: [${unreachable.join(", ")}]`);
    }

    // Save to file
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
