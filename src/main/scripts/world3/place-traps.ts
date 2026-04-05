import { critters, trapConfigs } from "../../../parsers/trapping";
import type { Point } from "../../backend/backend-types";
import { setState } from "../../state-hub";
import { delay } from "../../utils";
import { defineScript } from "../define-script";

const VK_ESCAPE = 0x1b;
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
  backend: Parameters<Parameters<typeof defineScript>[0]["run"]>[0]["backend"],
  image: string,
  token: Parameters<Parameters<typeof defineScript>[0]["run"]>[0]["token"]
): Promise<void> => {
  const result = await backend.find(image, undefined, token);
  if (result.matches.length === 0) {
    throw new Error(`Could not find ${image}`);
  }
  await backend.click(result.matches[0]!, FAST_CLICK, token);
};

export default defineScript<[string, string, string]>({
  id: "world3.trapping.placeTraps",
  name: "Place Traps",
  run: async ({ token, backend, logger, args: [critter, trapType, timer] }) => {
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
      const isOpen = await backend.isVisible(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      if (isOpen.length === 0) {
        logger.log("Opening trapping UI...");
        await backend.findAndClick("trapping/trapping_drone", undefined, token);
        await delay(250, token);
        const confirmed = await backend.isVisible(
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
      await backend.findAndClick(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      await delay(250, token);
      await backend.findAndClick(
        "trapping/trapping_trash_all",
        undefined,
        token
      );
      await backend.keyPress(VK_ESCAPE, undefined, token);
      await delay(250, token);

      // Reopen and select critter
      logger.log("Reopening UI, selecting critter...");
      await backend.findAndClick("trapping/trapping_drone", undefined, token);
      await backend.findAndClick(critterImage, undefined, token);

      // Navigate to first character
      const atFirstChar = await backend.isVisible(
        "trapping/trapping_char_back_off",
        undefined,
        token
      );
      if (atFirstChar.length === 0) {
        logger.log("Navigating to first character...");
        await clickFast(backend, "trapping/trapping_char_back", token);
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
        let placeTrapClicked = await backend.findAndClick(
          "trapping/trapping_place_trap",
          undefined,
          token
        );

        if (!placeTrapClicked) {
          const needsCritter = await backend.isVisible(
            "trapping/trapping_select_critter",
            undefined,
            token
          );
          if (needsCritter.length > 0) {
            logger.log("Critter not selected, retrying...");
            await backend.findAndClick(critterImage, undefined, token);
            placeTrapClicked = await backend.findAndClick(
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
          const atFirstTrap = await backend.isVisible(
            "trapping/trapping_trap_back_off",
            undefined,
            token
          );
          if (atFirstTrap.length === 0) {
            logger.log("Navigating to first trap page...");
            await clickFast(backend, "trapping/trapping_trap_back", token);
            await delay(NAV_DELAY, token);
          }

          if (trapIndex > 0) {
            logger.log(
              `Navigating to ${trapType} page (${trapIndex} clicks)...`
            );
            const nextBtn = await backend.find(
              "trapping/trapping_trap_next",
              undefined,
              token
            );
            if (nextBtn.matches.length === 0) {
              throw new Error("Trap next button not found");
            }
            await backend.click(
              nextBtn.matches[0]!,
              { times: trapIndex },
              token
            );
          }
        }

        // Verify trap type visible
        const trapVisible = await backend.isVisible(
          trapImage,
          undefined,
          token
        );
        if (trapVisible.length === 0) {
          throw new Error(`Trap type ${trapType} not visible after navigation`);
        }

        // Select timer from grid
        if (isFirstCharacter || !savedTimerCoords) {
          const findResult = await backend.find(trapImage, undefined, token);
          if (findResult.matches.length === 0) {
            throw new Error(`No trap images found for ${trapType}`);
          }

          const sorted = sortRowMajor(findResult.matches);
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

        await backend.click(savedTimerCoords, FAST_CLICK, token);

        // Return to character select
        await backend.findAndClick("trapping/trapping_drone", undefined, token);
        await delay(300, token);

        // Check for next character
        const noMoreCharacters = await backend.isVisible(
          "trapping/trapping_char_next_off",
          undefined,
          token
        );
        if (noMoreCharacters.length > 0) {
          break;
        }

        await backend.findAndClick(
          "trapping/trapping_char_next",
          undefined,
          token
        );

        isFirstCharacter = false;
        characterNum++;
      }

      // Close
      await backend.keyPress(VK_ESCAPE, undefined, token);
      logger.log(`Done! Placed traps for ${characterNum} characters.`);
    } finally {
      setState("placeTraps", { current: null });
    }
  },
});
