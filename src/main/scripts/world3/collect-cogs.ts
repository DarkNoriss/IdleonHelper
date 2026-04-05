import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend/index.ts";
import { defineScript } from "../define-script.ts";
import { navigation } from "../game-nav/index.ts";
import {
  COGS_STEP,
  COLLECT_ULTIMATE_COGS,
  SPARE_COLUMNS,
  SPARE_FIRST_COORDS,
  SPARE_ROWS,
} from "./construction-constants.ts";

export default defineScript({
  id: "world3.construction.collectCogs",
  name: "Collect Cogs",
  run: async ({ token, logger }) => {
    logger.log("Navigating to cogs tab...");
    const navigationSuccess = await navigation.construction.toCogsTab(token);
    if (!navigationSuccess) {
      logger.log("Failed to navigate to cogs tab, stopping script");
      return;
    }

    logger.log("Ensuring cog shelf is open...");
    await navigation.construction.ensureCogShelfOn(token);

    logger.log("Ensuring last page...");
    await navigation.construction.ensureLastPage(token);

    logger.log("Ensuring trash is closed...");
    await navigation.construction.ensureTrashOff(token);

    // Calculate spare area bounds with 4px padding
    const PADDING = 4;
    const lastSpareX = SPARE_FIRST_COORDS.x + (SPARE_COLUMNS - 1) * COGS_STEP;
    const lastSpareY = SPARE_FIRST_COORDS.y + (SPARE_ROWS - 1) * COGS_STEP;
    const spareAreaOffset = {
      left: SPARE_FIRST_COORDS.x - PADDING,
      top: SPARE_FIRST_COORDS.y - PADDING,
      right: lastSpareX + COGS_STEP + PADDING,
      bottom: lastSpareY + COGS_STEP + PADDING,
    };

    const MAX_ITERATIONS = 250;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      token.throwIfCancelled();

      logger.log("Checking if board is empty (within spare area)...");
      const isBoardEmpty = await backendCommand.isVisible(
        "ui/codex/quik-ref/construction/board_empty",
        { offset: spareAreaOffset },
        token
      );

      if (!isBoardEmpty) {
        logger.log("Board is not empty (spare is full), collection complete");
        break;
      }

      iteration++;
      logger.log(
        `Board is empty, clicking collect ultimate cogs button 10 times (iteration ${iteration}/${MAX_ITERATIONS})...`
      );

      const presetOptions = getClickOptionsFromPreset(ClickPreset.UltraFast);

      await backendCommand.click(
        COLLECT_ULTIMATE_COGS,
        { times: 10, ...presetOptions },
        token
      );
    }

    if (iteration >= MAX_ITERATIONS) {
      logger.log(`Reached maximum iterations (${MAX_ITERATIONS}), stopping`);
    }

    logger.log("Closing cog shelf...");
    await navigation.construction.ensureCogShelfOff(token);

    logger.log("Collect cogs completed successfully");
  },
});
