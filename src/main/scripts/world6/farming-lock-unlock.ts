import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend/index";
import { delay, logger } from "../../utils/index";
import { defineScript } from "../define-script";
import { FARMING_GRID } from "./farming-constants";

export default defineScript({
  id: "world6.farming.lockUnlock",
  name: "Lock/Unlock Crops",
  run: async ({ token }) => {
    token.throwIfCancelled();

    await delay(100, token);

    const startX = FARMING_GRID.FIRST_POSITION.x;
    const startY = FARMING_GRID.FIRST_POSITION.y;

    const allCoordinates: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < FARMING_GRID.ROWS; row++) {
      for (let col = 0; col < FARMING_GRID.COLUMNS; col++) {
        allCoordinates.push({
          x: startX + col * FARMING_GRID.X_STEP,
          y: startY + row * FARMING_GRID.Y_STEP,
        });
      }
    }

    logger.log(`Calculated ${allCoordinates.length} crop positions`);

    const presetOptions = getClickOptionsFromPreset(ClickPreset.Extreme);
    for (const coordinate of allCoordinates) {
      token.throwIfCancelled();
      await backendCommand.click(coordinate, presetOptions, token);
    }

    logger.log(`Clicked on ${allCoordinates.length} crop positions`);
  },
});
