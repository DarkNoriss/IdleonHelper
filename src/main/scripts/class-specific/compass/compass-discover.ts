import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineScript } from "../../define-script";
import { COMPASS_NODES } from "./compass-graph";
import {
  centerNode,
  findAnyNode,
  findCompassCenter,
  findPath,
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

export default defineScript<[string]>({
  id: "classSpecific.compass.discover",
  name: "Compass Discover",
  run: async ({ token, backend, logger, args: [nodeId] }) => {
    const node = COMPASS_NODES[nodeId];
    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    logger.log(`Discovering neighbors of: ${nodeId}`);

    await openCompass(backend, token, logger);
    const center = await findCompassCenter(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, center);

    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Found start node: ${startNode.id}`);
    await backend.drag(startNode.point, center, { instant: true }, token);

    if (startNode.id !== nodeId) {
      const graph = loadGraph();
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

    logger.log("Scanning for visible nodes...");
    const visibleNodes: string[] = [];
    for (const [id, n] of Object.entries(COMPASS_NODES)) {
      if (id === nodeId) {
        continue;
      }
      token.throwIfCancelled();
      const visible = await backend.isVisible(n.image, undefined, token);
      if (visible) {
        visibleNodes.push(id);
        logger.log(`  Visible: ${id}`);
      }
    }

    if (visibleNodes.length === 0) {
      logger.log("No neighbor nodes found");
    } else {
      logger.log(
        `\nNeighbors of "${nodeId}": [${visibleNodes.map((n) => `"${n}"`).join(", ")}]`
      );
    }

    logger.log("Discovery finished");
  },
});
