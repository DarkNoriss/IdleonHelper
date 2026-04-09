import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const FARMING_PATH = "ui/map/world-6/town/farming";

export default defineScript({
  id: "world6.farming.farmingCollectCropsDebug",
  name: "Farming - Collect Crops Debug",
  run: async ({ token }) => {
    logger.log("farming-collect-crops-debug - scanning all overgrowth images");

    // Check panel state
    for (const name of ["farming_back", "farming_crop_info"]) {
      token.throwIfCancelled();
      const result = await backendCommand.findWithDebug(
        `${FARMING_PATH}/${name}`,
        undefined,
        token
      );
      if (result.matches.length === 0) {
        logger.log(`${name} - no matches`);
      } else {
        for (const match of result.matches) {
          logger.log(
            `${name} - (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(4)}`
          );
        }
      }
      if (result.debugImagePath) {
        logger.log(`  debug image: ${result.debugImagePath}`);
      }
    }

    // Scan all overgrowth levels
    for (let i = 0; i <= 14; i++) {
      token.throwIfCancelled();
      const ogLabel = i === 0 ? "0x" : `${2 ** i}x`;
      const result = await backendCommand.findWithDebug(
        `${FARMING_PATH}/farming_og_${i}`,
        undefined,
        token
      );
      if (result.matches.length === 0) {
        logger.log(`og_${i} (${ogLabel}) - no matches`);
      } else {
        for (const match of result.matches) {
          logger.log(
            `og_${i} (${ogLabel}) - (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(4)}`
          );
        }
      }
      if (result.debugImagePath) {
        logger.log(`  debug image: ${result.debugImagePath}`);
      }
    }

    logger.log("farming-collect-crops-debug - done");
  },
});
