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
  const result = await backend.find(image, { timeoutMs: 3000 }, token);
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

    try {
      // Step 1: Open trapping UI
      logger.log("Opening trapping UI...");
      const isOpen = await backend.isVisible(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      if (!isOpen) {
        logger.log("Trapping UI not open, clicking drone...");
        await backend.findAndClick(
          "trapping/trapping_drone",
          { timeoutMs: 5000 },
          token
        );
        await delay(500, token);
        const confirmed = await backend.isVisible(
          "trapping/trapping_delete_trap",
          undefined,
          token
        );
        if (!confirmed) {
          throw new Error("Failed to open trapping UI");
        }
      }

      // Step 2: Delete all existing traps
      logger.log("Deleting all existing traps...");
      await backend.findAndClick(
        "trapping/trapping_delete_trap",
        { timeoutMs: 3000 },
        token
      );
      await delay(300, token);
      await backend.findAndClick(
        "trapping/trapping_trash_all",
        { timeoutMs: 3000 },
        token
      );
      await delay(300, token);
      await backend.keyPress(VK_ESCAPE, undefined, token);
      await delay(300, token);

      // Reopen trapping UI
      logger.log("Reopening trapping UI...");
      await backend.findAndClick(
        "trapping/trapping_drone",
        { timeoutMs: 5000 },
        token
      );
      await delay(500, token);

      // Step 3: Select critter
      logger.log(`Selecting critter: ${critter}...`);
      await backend.findAndClick(critterImage, { timeoutMs: 3000 }, token);
      await delay(300, token);

      // Step 4: Navigate to first character
      logger.log("Navigating to first character...");
      const atFirstChar = await backend.isVisible(
        "trapping/trapping_char_back_off",
        undefined,
        token
      );
      if (!atFirstChar) {
        await clickFast(backend, "trapping/trapping_char_back", token);
        await delay(NAV_DELAY, token);
      }

      // Step 5: Character loop
      let characterNum = 1;
      let isFirstCharacter = true;
      let savedTimerCoords: Point | null = null;

      while (true) {
        token.throwIfCancelled();
        setState("placeTraps", { current: characterNum });
        logger.log(`Placing trap for character ${characterNum}...`);

        // 5a: Click place trap
        let placeTrapClicked = await backend.findAndClick(
          "trapping/trapping_place_trap",
          { timeoutMs: 3000 },
          token
        );

        if (!placeTrapClicked) {
          // Maybe critter wasn't selected — check and retry
          const needsCritter = await backend.isVisible(
            "trapping/trapping_select_critter",
            undefined,
            token
          );
          if (needsCritter) {
            logger.log("Critter not selected, retrying...");
            await backend.findAndClick(
              critterImage,
              { timeoutMs: 3000 },
              token
            );
            await delay(300, token);
            placeTrapClicked = await backend.findAndClick(
              "trapping/trapping_place_trap",
              { timeoutMs: 3000 },
              token
            );
          }
          if (!placeTrapClicked) {
            throw new Error(
              `Place Trap button not found for character ${characterNum}`
            );
          }
        }
        await delay(300, token);

        if (isFirstCharacter) {
          // 5b (first character): Navigate to trap type page
          logger.log("Navigating to first trap page...");
          const atFirstTrap = await backend.isVisible(
            "trapping/trapping_trap_back_off",
            undefined,
            token
          );
          if (!atFirstTrap) {
            await clickFast(backend, "trapping/trapping_trap_back", token);
            await delay(NAV_DELAY, token);
          }

          // Navigate forward to the correct trap page
          if (trapIndex > 0) {
            logger.log(`Navigating to trap page ${trapIndex + 1}...`);
            for (let i = 0; i < trapIndex; i++) {
              token.throwIfCancelled();
              await clickFast(backend, "trapping/trapping_trap_next", token);
              await delay(NAV_DELAY, token);
            }
          }
        }

        // Verify trap type is visible
        const trapVisible = await backend.isVisible(
          trapImage,
          undefined,
          token
        );
        if (!trapVisible) {
          throw new Error(`Trap type ${trapType} not visible after navigation`);
        }

        // 5c: Select timer
        if (isFirstCharacter || !savedTimerCoords) {
          logger.log("Finding timer grid...");
          const findResult = await backend.find(
            trapImage,
            { timeoutMs: 3000 },
            token
          );

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
        }

        logger.log(
          `Clicking timer at (${savedTimerCoords.x}, ${savedTimerCoords.y})...`
        );
        await backend.click(savedTimerCoords, FAST_CLICK, token);
        await delay(300, token);

        // 5d: Return to character select
        logger.log("Returning to character select...");
        await backend.findAndClick(
          "trapping/trapping_drone",
          { timeoutMs: 3000 },
          token
        );
        await delay(300, token);

        // 5e: Check for next character
        const noMoreCharacters = await backend.isVisible(
          "trapping/trapping_char_next_off",
          undefined,
          token
        );
        if (noMoreCharacters) {
          logger.log("No more characters. Done placing traps.");
          break;
        }

        await backend.findAndClick(
          "trapping/trapping_char_next",
          { timeoutMs: 3000 },
          token
        );
        await delay(NAV_DELAY, token);

        isFirstCharacter = false;
        characterNum++;
      }

      // Step 6: Close
      logger.log("Closing trapping UI...");
      await backend.keyPress(VK_ESCAPE, undefined, token);

      logger.log(`Done! Placed traps for ${characterNum} characters.`);
    } finally {
      setState("placeTraps", { current: null });
    }
  },
});
