import { backendCommand } from "../../../backend/index";
import { setState } from "../../../state-hub";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { setAuto } from "../../game-nav/auto";
import { selectCardPreset } from "../../general/cards/card-select-preset";
import { clickBannerReset, openBossBanner } from "./banner";
import {
  ENTER_POINT,
  EXIT_BUTTON_POINT,
  PORTAL_POINT,
  POST_ENTER_DELAY_MS,
  POST_EXIT_DELAY_MS,
  POST_LINE_DELAY_MS,
  W6_BOSS_HSV,
} from "./constants";
import { waitForEmperorDead } from "./emperor-monitor";

const setRunning = (
  phase: "preparing" | "entering" | "fighting" | "exiting"
): void => {
  setState("w6BossFarmer", { running: true, phase });
};

const setIdle = (): void => {
  setState("w6BossFarmer", { running: false, phase: "idle" });
};

export default defineScript<[number | null, boolean]>({
  id: "world6.bossFarmer.run",
  name: "W6 Boss Farmer",
  run: async ({ token, args: [presetSlot, skipReset] }) => {
    logger.log(
      `W6 Boss Farmer: starting (presetSlot=${presetSlot ?? "skip"}, skipReset=${skipReset})`
    );
    setRunning("preparing");
    try {
      // One-time setup before the loop
      await setAuto("off", token);
      if (presetSlot !== null) {
        await selectCardPreset(presetSlot, token);
      }

      let iteration = 0;
      while (true) {
        token.throwIfCancelled();
        iteration += 1;
        logger.log(`W6 Boss Farmer: iteration ${iteration}`);

        setRunning("preparing");
        const opened = await openBossBanner(token);
        if (!opened) {
          throw new Error("Failed to open W6 boss banner");
        }

        if (skipReset) {
          logger.log("Skipping banner reset (push mode)");
        } else {
          const resetClicked = await clickBannerReset(token);
          if (!resetClicked) {
            throw new Error("Banner reset button not found");
          }
        }

        setRunning("entering");
        logger.log(`Clicking enter at (${ENTER_POINT.x}, ${ENTER_POINT.y})`);
        await backendCommand.click(ENTER_POINT, undefined, token);
        await delay(POST_ENTER_DELAY_MS, token);

        await setAuto("off", token);

        const lineMatches = await backendCommand.findHSV(
          "world6/boss/boss_line",
          W6_BOSS_HSV.hsvLower,
          W6_BOSS_HSV.hsvUpper,
          undefined,
          token
        );
        if (lineMatches.length === 0) {
          throw new Error("Boss line not found");
        }
        await backendCommand.click(lineMatches[0]!, undefined, token);
        logger.log("Clicked boss line");
        await delay(POST_LINE_DELAY_MS, token);

        setRunning("fighting");
        await setAuto("on", token);
        await waitForEmperorDead(token);
        await setAuto("off", token);

        setRunning("exiting");
        logger.log(
          `Clicking exit at (${EXIT_BUTTON_POINT.x}, ${EXIT_BUTTON_POINT.y})`
        );
        await backendCommand.click(EXIT_BUTTON_POINT, undefined, token);
        await delay(POST_EXIT_DELAY_MS, token);
        logger.log(`Clicking portal at (${PORTAL_POINT.x}, ${PORTAL_POINT.y})`);
        await backendCommand.click(PORTAL_POINT, undefined, token);

        logger.log(`W6 Boss Farmer: iteration ${iteration} complete`);
      }
    } finally {
      setIdle();
    }
  },
});
