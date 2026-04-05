import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import { defineScript } from "../../define-script.ts";
import {
  COMPASS_CENTER,
  centerNodeOrThrow,
  findAnyNode,
  findPath,
  loadGraph,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils.ts";

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

    logger.log(`Centered on: ${nodeId}`);
    logger.log(`Compass center: (${COMPASS_CENTER.x}, ${COMPASS_CENTER.y})`);
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
          const offsetX = match.point.x - COMPASS_CENTER.x;
          const offsetY = match.point.y - COMPASS_CENTER.y;
          logger.log(
            `  Match: (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(3)} offset=({x: ${offsetX}, y: ${offsetY}})`
          );
        }
      }
    }

    logger.log("\nMinor debug finished");
  },
});
