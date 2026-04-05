import type { CompassUpgrade } from "../../../types/compass";
import { delay } from "../../utils";
import { defineScript } from "../define-script";

const ARROW_DOWN_MAX_ATTEMPTS = 3;
const SCROLL_IN_TIMES = 8;
const WHEEL_DELTA = 120;

export default defineScript<[CompassUpgrade[]]>({
  id: "classSpecific.compass.run",
  name: "Compass",
  run: async ({ token, backend, logger, args: [upgrades] }) => {
    logger.log(`Compass: received ${upgrades.length} upgrades`);
    for (const upgrade of upgrades) {
      logger.log(`  ${upgrade.name}: +${upgrade.change}`);
    }

    // Step 1: Find and open Compass attack
    logger.log("Looking for Compass skill...");
    let compassFound = false;

    const quickFindCompass = async (): Promise<boolean> => {
      if (
        await backend.isVisible("ui/attacks/attack_compass", undefined, token)
      ) {
        return backend.findAndClick(
          "ui/attacks/attack_compass",
          { timeoutMs: 1000 },
          token
        );
      }
      return false;
    };

    const scrollAndFindCompass = async (): Promise<boolean> => {
      for (let i = 0; i < ARROW_DOWN_MAX_ATTEMPTS; i++) {
        token.throwIfCancelled();
        logger.log(
          `Scrolling down attack bar (${i + 1}/${ARROW_DOWN_MAX_ATTEMPTS})...`
        );
        if (
          await backend.isVisible(
            "ui/attacks/attack_arrow_down",
            undefined,
            token
          )
        ) {
          await backend.findAndClick(
            "ui/attacks/attack_arrow_down",
            { timeoutMs: 1000 },
            token
          );
          await delay(200, token);
          const found = await quickFindCompass();
          if (found) {
            return true;
          }
        }
      }
      return false;
    };

    // Fast: check if compass is already visible
    compassFound = await quickFindCompass();

    // Fast: scroll through attack bar rows
    if (!compassFound) {
      compassFound = await scrollAndFindCompass();
    }

    // Slow fallback: open attacks bar, then retry
    if (!compassFound) {
      logger.log("Compass not found. Opening attacks bar...");
      const attacksClicked = await backend.findAndClick(
        "ui/attacks/attacks",
        { timeoutMs: 3000 },
        token
      );

      if (attacksClicked) {
        await delay(500, token);
        compassFound = await quickFindCompass();

        if (!compassFound) {
          compassFound = await scrollAndFindCompass();
        }
      }
    }

    if (!compassFound) {
      throw new Error("Compass skill not found on attack bar");
    }

    await delay(500, token);

    // Step 2: Scroll in to zoom
    logger.log(`Scrolling in ${SCROLL_IN_TIMES} times...`);
    await backend.scroll(WHEEL_DELTA, { times: SCROLL_IN_TIMES }, token);
    await delay(300, token);

    logger.log("Compass script finished");
  },
});
