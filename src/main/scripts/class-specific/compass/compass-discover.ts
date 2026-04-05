import { defineScript } from "../../define-script";
import { COMPASS_NODES } from "./compass-graph";
import {
  findCompassCenter,
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

    // Step 1: Open compass
    await openCompass(backend, token, logger);

    // Step 2: Find compass center
    const center = await findCompassCenter(backend, token, logger);

    // Step 3: Scroll in
    await scrollInAtCenter(backend, token, logger, center);

    // Step 4: Find and drag selected node to center
    logger.log(`Finding ${nodeId}...`);
    const target = await backend.find(node.image, undefined, token);
    if (target.matches.length === 0) {
      throw new Error(`Node "${nodeId}" not found on screen`);
    }
    logger.log(`Dragging ${nodeId} to center...`);
    await backend.drag(target.matches[0]!, center, { instant: true }, token);

    // Step 5: Scan for all known nodes
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
