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
  POST_PORTAL_DELAY_MS,
  W6_BOSS_HSV,
} from "./constants";
import { waitForEmperorDead } from "./emperor-monitor";

const setRunning = (
  phase: "preparing" | "entering" | "fighting" | "exiting",
  iteration: number,
  total: number
): void => {
  setState("w6BossFarmer", { running: true, phase, iteration, total });
};

const setIdle = (): void => {
  setState("w6BossFarmer", {
    running: false,
    phase: "idle",
    iteration: 0,
    total: 0,
  });
};

export default defineScript<[number | null, boolean, number]>({
  id: "world6.bossFarmer.run",
  name: "W6 Boss Farmer",
  run: async ({ token, args: [presetSlot, skipReset, attempts] }) => {
    logger.log(
      `W6 Boss Farmer: starting (presetSlot=${presetSlot ?? "skip"}, skipReset=${skipReset}, attempts=${attempts})`
    );
    if (attempts <= 0) {
      logger.log("W6 Boss Farmer: no attempts available, aborting");
      return;
    }
    setRunning("preparing", 0, attempts);
    try {
      // One-time setup before the loop
      await setAuto("off", token);
      if (presetSlot !== null) {
        await selectCardPreset(presetSlot, token);
      }

      for (let iteration = 1; iteration <= attempts; iteration++) {
        token.throwIfCancelled();
        logger.log(`W6 Boss Farmer: iteration ${iteration}/${attempts}`);

        setRunning("preparing", iteration, attempts);
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

        setRunning("entering", iteration, attempts);
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

        setRunning("fighting", iteration, attempts);
        await setAuto("on", token);
        await waitForEmperorDead(token);
        await setAuto("off", token);

        setRunning("exiting", iteration, attempts);
        logger.log(
          `Clicking exit at (${EXIT_BUTTON_POINT.x}, ${EXIT_BUTTON_POINT.y})`
        );
        await backendCommand.click(EXIT_BUTTON_POINT, undefined, token);
        await delay(POST_EXIT_DELAY_MS, token);
        logger.log(`Clicking portal at (${PORTAL_POINT.x}, ${PORTAL_POINT.y})`);
        await backendCommand.click(PORTAL_POINT, undefined, token);
        await delay(POST_PORTAL_DELAY_MS, token);

        logger.log(
          `W6 Boss Farmer: iteration ${iteration}/${attempts} complete`
        );
      }
      logger.log("W6 Boss Farmer: all attempts consumed, stopping");
    } finally {
      setIdle();
    }
  },
});
