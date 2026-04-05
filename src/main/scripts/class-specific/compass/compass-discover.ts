import { defineScript } from "../../define-script";
import { COMPASS_NODES } from "./compass-graph";
import {
  COMPASS_CENTER,
  centerNodeOrThrow,
  findAnyNode,
  findPath,
  loadGraph,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

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
    await scrollInAtCenter(backend, token, logger, COMPASS_CENTER);

    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Found start node: ${startNode.id}`);
    await backend.drag(
      startNode.point,
      COMPASS_CENTER,
      { instant: true },
      token
    );

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
        await centerNodeOrThrow(path[i]!, COMPASS_CENTER, backend, token);
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
