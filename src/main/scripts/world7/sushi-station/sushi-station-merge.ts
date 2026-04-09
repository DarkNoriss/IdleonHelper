import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
  getDragOptionsFromPreset,
} from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  SUSHI_COOK,
  SUSHI_GRID,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

const cellToPoint = (cellIndex: number) => {
  const col = cellIndex % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cellIndex / SUSHI_GRID.COLUMNS);
  return {
    x: SUSHI_GRID.FIRST_POSITION.x + col * SUSHI_GRID.X_STEP,
    y: SUSHI_GRID.FIRST_POSITION.y + row * SUSHI_GRID.Y_STEP,
  };
};

export default defineScript<[boolean]>({
  id: "world7.sushiStation.sushiStationMerge",
  name: "Sushi Station - Merge",
  run: async ({ token, args: [shouldCook] }) => {
    logger.log("sushi-station-merge - ensuring tiers are visible");

    const visibility = await backendCommand.isVisibleParallel(
      { tiersOn: SUSHI_TIERS_ON, tiersOff: SUSHI_TIERS_OFF },
      undefined,
      token
    );

    const tiersOff = visibility.tiersOff ?? [];

    if (tiersOff.length > 0) {
      logger.log("sushi-station-merge - tiers off, clicking to enable");
      await backendCommand.click(tiersOff[0]!, undefined, token);
      const confirm = await backendCommand.isVisible(
        SUSHI_TIERS_ON,
        undefined,
        token
      );
      if (confirm.length === 0) {
        logger.log("sushi-station-merge - failed to enable tiers");
        return;
      }
      logger.log("sushi-station-merge - tiers enabled");
    }

    logger.log("sushi-station-merge - starting continuous merge loop");

    const regions = buildSushiRegions();

    while (true) {
      token.throwIfCancelled();

      const response = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );

      const grouped = new Map<string, number[]>();
      for (const result of response.results) {
        if (result.match === null) {
          continue;
        }
        const indices = grouped.get(result.match);
        if (indices) {
          indices.push(result.regionIndex);
        } else {
          grouped.set(result.match, [result.regionIndex]);
        }
      }

      let merged = false;
      for (const [tier, indices] of grouped) {
        if (indices.length < 2) {
          continue;
        }

        const from = cellToPoint(indices[0]!);
        const to = cellToPoint(indices[1]!);
        const fromCol = indices[0]! % SUSHI_GRID.COLUMNS;
        const fromRow = Math.floor(indices[0]! / SUSHI_GRID.COLUMNS);
        const toCol = indices[1]! % SUSHI_GRID.COLUMNS;
        const toRow = Math.floor(indices[1]! / SUSHI_GRID.COLUMNS);

        logger.log(
          `sushi-station-merge - merging ${tier} [${fromRow},${fromCol}] -> [${toRow},${toCol}]`
        );

        token.throwIfCancelled();
        const dragOptions = getDragOptionsFromPreset(ClickPreset.Extreme, true);
        await backendCommand.drag(from, to, dragOptions, token);
        merged = true;
        break;
      }

      if (!merged && shouldCook) {
        logger.log("sushi-station-merge - no pairs, cooking more sushi");
        const cookButton = await backendCommand.isVisible(
          SUSHI_COOK,
          undefined,
          token
        );
        if (cookButton.length > 0) {
          const clickOptions = getClickOptionsFromPreset(ClickPreset.Extreme);
          await backendCommand.click(
            cookButton[0]!,
            { ...clickOptions, times: 20 },
            token
          );
        }
      }
    }
  },
});
