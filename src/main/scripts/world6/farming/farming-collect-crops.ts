import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildOvergrowthRegions,
  FARMING_GRID,
  MIN_OVERGROWTH_MULTIPLIER,
  OVERGROWTH_HSV_LOWER,
  OVERGROWTH_HSV_UPPER,
  OVERGROWTH_TEMPLATES,
} from "./farming-constants";

const parseMultiplier = (match: string): number => {
  const digits = match.replace(/\D+/g, "");
  const num = Number.parseInt(digits, 10);
  return Number.isNaN(num) ? 0 : num;
};

export default defineScript<[number]>({
  id: "world6.farming.farmingCollectCrops",
  name: "Farming - Collect Crops",
  run: async ({ token, args }) => {
    const [minOvergrowth] = args;
    const minMultiplier =
      minOvergrowth === 0
        ? 0
        : Math.max(2 ** minOvergrowth, MIN_OVERGROWTH_MULTIPLIER);
    const label = minOvergrowth === 0 ? "0x" : `${minMultiplier}x`;
    logger.log(`farming-collect-crops - collecting overgrowth >= ${label}`);

    const regions = buildOvergrowthRegions();
    const clickOptions = getClickOptionsFromPreset("8x");

    while (true) {
      token.throwIfCancelled();

      const response = await backendCommand.readRegions(
        regions,
        { ...OVERGROWTH_HSV_LOWER },
        { ...OVERGROWTH_HSV_UPPER },
        OVERGROWTH_TEMPLATES,
        undefined,
        token
      );

      const matches = response.results.filter(
        (r) => r.match !== null && parseMultiplier(r.match) >= minMultiplier
      );

      if (matches.length === 0) {
        continue;
      }

      logger.log(
        `farming-collect-crops - found ${matches.length} crops >= ${label}`
      );

      for (const match of matches) {
        token.throwIfCancelled();
        const col = match.regionIndex % FARMING_GRID.COLUMNS;
        const row = Math.floor(match.regionIndex / FARMING_GRID.COLUMNS);
        const cropX = FARMING_GRID.FIRST_POSITION.x + col * FARMING_GRID.X_STEP;
        const cropY = FARMING_GRID.FIRST_POSITION.y + row * FARMING_GRID.Y_STEP;

        logger.log(
          `farming-collect-crops - clicking ${match.match!} at [${row},${col}]`
        );
        await backendCommand.click({ x: cropX, y: cropY }, clickOptions, token);
      }
    }
  },
});
