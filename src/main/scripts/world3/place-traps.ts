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
      `Config: critter=${critter}, trap=${trapType} (page ${trapIndex + 1}), timer=${timer} (index ${timerIndex})`
    );

    try {
      // Step 1: Open trapping UI
      logger.log("[Step 1] Checking if trapping UI is open...");
      const isOpen = await backend.isVisible(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      if (isOpen) {
        logger.log("[Step 1] Trapping UI already open");
      } else {
        logger.log("[Step 1] Not open, clicking drone...");
        await backend.findAndClick("trapping/trapping_drone", undefined, token);
        await delay(250, token);
        const confirmed = await backend.isVisible(
          "trapping/trapping_delete_trap",
          undefined,
          token
        );
        if (!confirmed) {
          throw new Error("Failed to open trapping UI");
        }
        logger.log("[Step 1] Trapping UI opened");
      }

      // Step 2: Delete all existing traps
      logger.log("[Step 2] Clicking Delete Trap button...");
      await backend.findAndClick(
        "trapping/trapping_delete_trap",
        undefined,
        token
      );
      await delay(250, token);
      logger.log("[Step 2] Clicking Trash All...");
      await backend.findAndClick(
        "trapping/trapping_trash_all",
        undefined,
        token
      );
      logger.log("[Step 2] Pressing Escape to close...");
      await backend.keyPress(VK_ESCAPE, undefined, token);
      await delay(250, token);
      logger.log("[Step 2] All traps deleted");

      // Step 3: Reopen trapping UI
      logger.log("[Step 3] Reopening trapping UI...");
      await backend.findAndClick("trapping/trapping_drone", undefined, token);

      // Step 4: Select critter
      logger.log(`[Step 4] Selecting critter: ${critter}...`);
      await backend.findAndClick(critterImage, undefined, token);
      logger.log("[Step 4] Critter selected");

      // Step 5: Navigate to first character
      logger.log("[Step 5] Checking if already on first character...");
      const atFirstChar = await backend.isVisible(
        "trapping/trapping_char_back_off",
        undefined,
        token
      );
      if (atFirstChar) {
        logger.log("[Step 5] Already on first character");
      } else {
        logger.log("[Step 5] Navigating back to first character...");
        await clickFast(backend, "trapping/trapping_char_back", token);
        await delay(NAV_DELAY, token);
        logger.log("[Step 5] At first character");
      }

      // Step 6: Character loop
      let characterNum = 1;
      let isFirstCharacter = true;
      let savedTimerCoords: Point | null = null;

      while (true) {
        token.throwIfCancelled();
        setState("placeTraps", { current: characterNum });
        logger.log(`--- Character ${characterNum} ---`);

        // 6a: Click place trap
        logger.log("[6a] Clicking Place Trap...");
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
          if (needsCritter) {
            logger.log("[6a] Critter not selected, retrying...");
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
        logger.log("[6a] Place Trap clicked");

        if (isFirstCharacter) {
          // 6b: Navigate to trap type page (first character only)
          logger.log("[6b] Checking if on first trap page...");
          const atFirstTrap = await backend.isVisible(
            "trapping/trapping_trap_back_off",
            undefined,
            token
          );
          if (atFirstTrap) {
            logger.log("[6b] Already on first trap page");
          } else {
            logger.log("[6b] Navigating back to first trap page...");
            await clickFast(backend, "trapping/trapping_trap_back", token);
            await delay(NAV_DELAY, token);
          }

          if (trapIndex > 0) {
            logger.log(
              `[6b] Clicking Next ${trapIndex} times to reach ${trapType} page...`
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
          logger.log(`[6b] On ${trapType} trap page`);
        }

        // 6c: Verify trap type
        logger.log(`[6c] Verifying ${trapType} is visible...`);
        const trapVisible = await backend.isVisible(
          trapImage,
          undefined,
          token
        );
        if (!trapVisible) {
          throw new Error(`Trap type ${trapType} not visible after navigation`);
        }
        logger.log("[6c] Trap type confirmed");

        // 6d: Select timer
        if (isFirstCharacter || !savedTimerCoords) {
          logger.log(
            `[6d] Finding timer grid (${selectedTrap.timers.length} positions)...`
          );
          const findResult = await backend.find(trapImage, undefined, token);

          if (findResult.matches.length === 0) {
            throw new Error(`No trap images found for ${trapType}`);
          }

          const sorted = sortRowMajor(findResult.matches);
          logger.log(
            `[6d] Found ${sorted.length} positions, picking index ${timerIndex} (${timer})`
          );

          if (timerIndex >= sorted.length) {
            throw new Error(
              `Timer index ${timerIndex} out of range (found ${sorted.length} positions)`
            );
          }

          savedTimerCoords = sorted[timerIndex]!;
        }

        logger.log(
          `[6d] Clicking timer ${timer} at (${savedTimerCoords.x}, ${savedTimerCoords.y})...`
        );
        await backend.click(savedTimerCoords, FAST_CLICK, token);
        logger.log("[6d] Timer selected");

        // 6e: Return to character select
        logger.log("[6e] Clicking drone to return...");
        await backend.findAndClick("trapping/trapping_drone", undefined, token);
        await delay(300, token);

        // 6f: Check for next character
        const noMoreCharacters = await backend.isVisible(
          "trapping/trapping_char_next_off",
          undefined,
          token
        );
        if (noMoreCharacters) {
          logger.log(`[6f] No more characters after ${characterNum}`);
          break;
        }

        logger.log("[6f] Advancing to next character...");
        await backend.findAndClick(
          "trapping/trapping_char_next",
          undefined,
          token
        );

        isFirstCharacter = false;
        characterNum++;
      }

      // Step 7: Close
      logger.log("[Step 7] Pressing Escape to close trapping UI...");
      await backend.keyPress(VK_ESCAPE, undefined, token);

      logger.log(`Done! Placed traps for ${characterNum} characters.`);
    } finally {
      setState("placeTraps", { current: null });
    }
  },
});
