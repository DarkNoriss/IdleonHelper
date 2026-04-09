import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const FARMING_PATH = "ui/map/world-6/town/farming";

const buildOvergrowthImages = (minLevel: number): Record<string, string> => {
  const images: Record<string, string> = {};
  for (let i = minLevel; i <= 14; i++) {
    images[String(i)] = `${FARMING_PATH}/farming_og_${i}`;
  }
  return images;
};

export default defineScript<[number]>({
  id: "world6.farming.farmingCollectCrops",
  name: "Farming - Collect Crops",
  run: async ({ token, args }) => {
    const [minOvergrowth] = args;
    const label = minOvergrowth === 0 ? "0x" : `${2 ** minOvergrowth}x`;
    logger.log(`farming-collect-crops - collecting overgrowth >= ${label}`);

    // 1. Open crop info panel
    const visibility = await backendCommand.isVisibleParallel(
      {
        back: `${FARMING_PATH}/farming_back`,
        cropInfo: `${FARMING_PATH}/farming_crop_info`,
      },
      undefined,
      token
    );

    const backMatches = visibility.back ?? [];
    const cropInfoMatches = visibility.cropInfo ?? [];

    if (backMatches.length > 0) {
      logger.log("farming-collect-crops - crop info panel already open");
    } else if (cropInfoMatches.length > 0) {
      logger.log("farming-collect-crops - clicking crop info to open panel");
      await backendCommand.click(cropInfoMatches[0]!, undefined, token);
      const backCheck = await backendCommand.find(
        `${FARMING_PATH}/farming_back`,
        undefined,
        token
      );
      if (backCheck.length === 0) {
        logger.log(
          "farming-collect-crops - back button not found after clicking crop info, aborting"
        );
        return;
      }
      logger.log("farming-collect-crops - crop info panel opened");
    } else {
      logger.log(
        "farming-collect-crops - neither back nor crop info found, aborting"
      );
      return;
    }

    // 2. Prepare overgrowth images
    const images = buildOvergrowthImages(minOvergrowth);
    logger.log(
      `farming-collect-crops - scanning for ${Object.keys(images).length} overgrowth levels`
    );

    // 3. Find and click loop
    const clickOptions = getClickOptionsFromPreset(ClickPreset.Fast);

    while (true) {
      token.throwIfCancelled();

      const results = await backendCommand.findParallel(
        images,
        { timeoutMs: 60_000, threshold: 0.95 },
        token
      );

      const match = Object.entries(results).find(
        ([, points]) => points.length > 0
      );

      if (!match) {
        logger.log("farming-collect-crops - no overgrown crops found, done");
        return;
      }

      const [level, points] = match;
      const point = points[0]!;
      const ogLabel = Number(level) === 0 ? "0x" : `${2 ** Number(level)}x`;

      logger.log(
        `farming-collect-crops - found ${ogLabel} at (${point.x}, ${point.y}), clicking`
      );
      await backendCommand.click(point, clickOptions, token);
    }
  },
});
