import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const FARMING_PATH = "ui/map/world-6/town/farming";
const CROP_INFO = `${FARMING_PATH}/farming_crop_info`;
const BACK = `${FARMING_PATH}/farming_back`;

const buildOvergrowthImages = (minLevel: number): string[] => {
  const images: string[] = [];
  for (let i = minLevel; i <= 12; i++) {
    images.push(`${FARMING_PATH}/farming_og_${i}`);
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
      [BACK, CROP_INFO],
      undefined,
      token
    );

    const backMatches = visibility[BACK] ?? [];
    const cropInfoMatches = visibility[CROP_INFO] ?? [];

    if (backMatches.length > 0) {
      logger.log("farming-collect-crops - crop info panel already open");
    } else if (cropInfoMatches.length > 0) {
      logger.log("farming-collect-crops - clicking crop info to open panel");
      await backendCommand.click(cropInfoMatches[0]!, undefined, token);
      const backCheck = await backendCommand.find(BACK, undefined, token);
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
      `farming-collect-crops - scanning for ${images.length} overgrowth levels`
    );

    // 3. Find and click loop
    const clickOptions = getClickOptionsFromPreset(ClickPreset.Fast);

    while (true) {
      token.throwIfCancelled();

      const results = await backendCommand.findParallel(
        images,
        { timeoutMs: 60_000 },
        token
      );

      const match = Object.entries(results).find(
        ([, points]) => points.length > 0
      );

      if (!match) {
        logger.log("farming-collect-crops - no overgrown crops found, done");
        return;
      }

      const [imagePath, points] = match;
      const point = points[0]!;
      const ogLevel = imagePath.replace(`${FARMING_PATH}/farming_og_`, "");
      const ogLabel = Number(ogLevel) === 0 ? "0x" : `${2 ** Number(ogLevel)}x`;

      logger.log(
        `farming-collect-crops - found ${ogLabel} at (${point.x}, ${point.y}), clicking`
      );
      await backendCommand.click(point, clickOptions, token);
    }
  },
});
