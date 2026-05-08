import { critters, trapConfigs } from "../../../../parsers/trapping";
import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import { setState } from "../../../state-hub";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { closeMenu } from "../../keys";

const FAST_CLICK = { times: 10, interval: 30, holdTime: 15 };
const NAV_DELAY = 200;

const sortRowMajor = (points: Point[]): Point[] => {
  return [...points].sort((a, b) => {
    const rowThreshold = 30;
    const rowDiff = a.y - b.y;
    if (Math.abs(rowDiff) > rowThreshold) {
      return rowDiff;
    }
    return a.x - b.x;
  });
};

const clickFast = async (
  image: string,
  token: Parameters<Parameters<typeof defineScript>[0]["run"]>[0]["token"]
): Promise<void> => {
  const result = await backendCommand.find(image, undefined, token);
  if (result.length === 0) {
    throw new Error(`Could not find ${image}`);
  }
  await backendCommand.click(result[0]!, FAST_CLICK, token);
};

export default defineScript<[string, string, string]>({
  id: "world3.trapping.placeTraps",
  name: "Place Traps",
  run: async ({ token, args: [critter, trapType, timer] }) => {
    if (!critters.some((c) => c.value === critter)) {
      throw new Error(`Unknown critter: ${critter}`);
    }

    const trapIndex = trapConfigs.findIndex((t) => t.value === trapType);
    if (trapIndex === -1) {
      throw new Error(`Unknown trap type: ${trapType}`);
    }

    const selectedTrap = trapConfigs[trapIndex]!;
    const timerIndex = selectedTrap.timers.indexOf(timer);
    if (timerIndex === -1) {
      throw new Error(`Unknown timer ${timer} for trap type ${trapType}`);
    }

    const trapImage = `trapping/trapping_trap_${trapType}`;
    const critterImage = `trapping/trapping_critter_${critter}`;

    logger.log(
      `Place Traps: ${critter}, ${trapType} (page ${trapIndex + 1}), ${timer} (slot ${timerIndex})`
    );

    try {
      // Open trapping UI
      const isOpen = await backendCommand.isVisible(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      if (isOpen.length === 0) {
        logger.log("Opening trapping UI...");
        await backendCommand.findAndClick(
          "trapping/trapping_drone",
          undefined,
          token
        );
        await delay(250, token);
        const confirmed = await backendCommand.isVisible(
          "trapping/trapping_delete_trap",
          undefined,
          token
        );
        if (confirmed.length === 0) {
          throw new Error("Failed to open trapping UI");
        }
      }

      // Delete all existing traps
      logger.log("Deleting all traps...");
      await backendCommand.findAndClick(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      await delay(250, token);
      await backendCommand.findAndClick(
        "trapping/trapping_trash_all",
        undefined,
        token
      );
      await closeMenu(token);

      // Reopen and select critter
      logger.log("Reopening UI, selecting critter...");
      await backendCommand.findAndClick(
        "trapping/trapping_drone",
        undefined,
        token
      );
      await backendCommand.findAndClick(critterImage, undefined, token);

      // Navigate to first character
      const atFirstChar = await backendCommand.isVisible(
        "trapping/trapping_char_back_off",
        undefined,
        token
      );
      if (atFirstChar.length === 0) {
        logger.log("Navigating to first character...");
        await clickFast("trapping/trapping_char_back", token);
        await delay(NAV_DELAY, token);
      }

      // Character loop
      let characterNum = 1;
      let isFirstCharacter = true;
      let savedTimerCoords: Point | null = null;

      while (true) {
        token.throwIfCancelled();
        setState("placeTraps", { current: characterNum });
        logger.log(`Character ${characterNum}: placing trap...`);

        // Click place trap
        let placeTrapClicked = await backendCommand.findAndClick(
          "trapping/trapping_place_trap",
          undefined,
          token
        );

        if (!placeTrapClicked) {
          const needsCritter = await backendCommand.isVisible(
            "trapping/trapping_select_critter",
            undefined,
            token
          );
          if (needsCritter.length > 0) {
            logger.log("Critter not selected, retrying...");
            await backendCommand.findAndClick(critterImage, undefined, token);
            placeTrapClicked = await backendCommand.findAndClick(
              "trapping/trapping_place_trap",
              undefined,
              token
            );
          }
          if (!placeTrapClicked) {
            throw new Error(
              `Place Trap button not found for character ${characterNum}`
            );
          }
        }

        // Navigate to trap type page (first character only)
        if (isFirstCharacter) {
          const atFirstTrap = await backendCommand.isVisible(
            "trapping/trapping_trap_back_off",
            undefined,
            token
          );
          if (atFirstTrap.length === 0) {
            logger.log("Navigating to first trap page...");
            await clickFast("trapping/trapping_trap_back", token);
            await delay(NAV_DELAY, token);
          }

          if (trapIndex > 0) {
            logger.log(
              `Navigating to ${trapType} page (${trapIndex} clicks)...`
            );
            const nextBtn = await backendCommand.find(
              "trapping/trapping_trap_next",
              undefined,
              token
            );
            if (nextBtn.length === 0) {
              throw new Error("Trap next button not found");
            }
            await backendCommand.click(
              nextBtn[0]!,
              { times: trapIndex },
              token
            );
          }
        }

        // Verify trap type visible
        const trapVisible = await backendCommand.isVisible(
          trapImage,
          undefined,
          token
        );
        if (trapVisible.length === 0) {
          throw new Error(`Trap type ${trapType} not visible after navigation`);
        }

        // Select timer from grid
        if (isFirstCharacter || !savedTimerCoords) {
          const findResult = await backendCommand.find(
            trapImage,
            undefined,
            token
          );
          if (findResult.length === 0) {
            throw new Error(`No trap images found for ${trapType}`);
          }

          const sorted = sortRowMajor(findResult);
          if (timerIndex >= sorted.length) {
            throw new Error(
              `Timer index ${timerIndex} out of range (found ${sorted.length} positions)`
            );
          }

          savedTimerCoords = sorted[timerIndex]!;
          logger.log(
            `Timer grid: ${sorted.length} slots, picking ${timer} at (${savedTimerCoords.x}, ${savedTimerCoords.y})`
          );
        }

        await backendCommand.click(savedTimerCoords, FAST_CLICK, token);

        // Return to character select
        await backendCommand.findAndClick(
          "trapping/trapping_drone",
          undefined,
          token
        );
        await delay(300, token);

        // Check for next character
        const noMoreCharacters = await backendCommand.isVisible(
          "trapping/trapping_char_next_off",
          undefined,
          token
        );
        if (noMoreCharacters.length > 0) {
          break;
        }

        await backendCommand.findAndClick(
          "trapping/trapping_char_next",
          undefined,
          token
        );

        isFirstCharacter = false;
        characterNum++;
      }

      // Close
      await closeMenu(token);
      logger.log(`Done! Placed traps for ${characterNum} characters.`);
    } finally {
      setState("placeTraps", { current: null });
    }
  },
});
