import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { navigateTo } from "../../game-nav/helpers";
import {
  HSV_PLAY_LOWER,
  HSV_PLAY_UPPER,
  HSV_WHITE_LOWER,
  HSV_WHITE_UPPER,
  MAIN_MENU_FEET,
  MAIN_MENU_PAGE_BACK,
  MAIN_MENU_PAGE_NEXT,
  MAIN_MENU_PLAY,
  PLAYER_SELECT_SLOTS,
  SLOT_TOLERANCE_PX,
} from "./cloudsave-constants";

const matchSlotIndex = (point: Point): number | null => {
  for (let i = 0; i < PLAYER_SELECT_SLOTS.length; i++) {
    const slot = PLAYER_SELECT_SLOTS[i]!;
    if (
      Math.abs(point.x - slot.x) <= SLOT_TOLERANCE_PX &&
      Math.abs(point.y - slot.y) <= SLOT_TOLERANCE_PX
    ) {
      return i + 1;
    }
  }
  return null;
};

const findCurrentPlayingSlot = async (
  token: CancellationToken
): Promise<number | null> => {
  const matches = await backendCommand.isVisible(
    "ui/players/currently_playing",
    undefined,
    token
  );
  for (const m of matches) {
    const slot = matchSlotIndex(m);
    if (slot !== null) {
      logger.log(
        `cloudsave - currently_playing matched at (${m.x}, ${m.y}) - slot ${slot}`
      );
      return slot;
    }
  }
  if (matches.length > 0) {
    logger.log(
      `cloudsave - currently_playing matched but outside tolerance - ${JSON.stringify(matches)}`
    );
  }
  return null;
};

/**
 * Identifies which page the active character is on by going to page 1 first,
 * looking for currently_playing, and if not found falling back to page 2.
 * Returns { page: 1|2, slot: 1..6 } or null if not located.
 */
const locateActiveCharacter = async (
  token: CancellationToken
): Promise<{ page: 1 | 2; slot: number } | null> => {
  // Always start on page 1 - clicking page_back is a no-op if already there.
  const backClicked = await backendCommand.findHSV(
    "ui/players/page_back",
    HSV_WHITE_LOWER,
    HSV_WHITE_UPPER,
    undefined,
    token
  );
  if (backClicked.length > 0) {
    await backendCommand.click(backClicked[0]!, undefined, token);
  } else {
    logger.log("cloudsave - players page_back not found, assuming page 1");
  }

  const slotOnPage1 = await findCurrentPlayingSlot(token);
  if (slotOnPage1 !== null) {
    return { page: 1, slot: slotOnPage1 };
  }

  logger.log("cloudsave - not on page 1, advancing to page 2");
  const nextMatches = await backendCommand.findHSV(
    "ui/players/page_next",
    HSV_WHITE_LOWER,
    HSV_WHITE_UPPER,
    undefined,
    token
  );
  if (nextMatches.length === 0) {
    logger.error("cloudsave - players page_next not found");
    return null;
  }
  await backendCommand.click(nextMatches[0]!, undefined, token);

  const slotOnPage2 = await findCurrentPlayingSlot(token);
  if (slotOnPage2 !== null) {
    return { page: 2, slot: slotOnPage2 };
  }

  logger.error("cloudsave - currently_playing not found on page 1 or page 2");
  return null;
};

const waitForMainMenu = async (token: CancellationToken): Promise<boolean> => {
  // Wait on the main-menu Play button, not page_next - the Play button uses
  // the brighter HSV range (v >= 128) which is unique to the main menu, while
  // page_next can false-match against the player-select page_next button.
  const matches = await backendCommand.findHSV(
    "main-menu/play",
    HSV_PLAY_LOWER,
    HSV_PLAY_UPPER,
    undefined,
    token
  );
  if (matches.length > 0) {
    logger.log("cloudsave - main menu reached");
    return true;
  }
  logger.error("cloudsave - main menu not detected");
  return false;
};

const enterMainMenu = async (token: CancellationToken): Promise<boolean> => {
  const clicked = await backendCommand.findAndClick(
    "ui/players/player_menu_and_cloudsave",
    undefined,
    token
  );
  if (!clicked) {
    logger.error("cloudsave - player_menu_and_cloudsave button not found");
    return false;
  }
  await delay(750, token);

  return await waitForMainMenu(token);
};

const ensureMainMenuPage = async (
  page: 1 | 2,
  token: CancellationToken
): Promise<void> => {
  const target = page === 2 ? MAIN_MENU_PAGE_NEXT : MAIN_MENU_PAGE_BACK;
  await backendCommand.click(target, undefined, token);
};

/**
 * Performs an Idleon cloud save by stepping out to player-select, identifying
 * the currently active character, walking through the menu, and re-entering
 * play on the same character.
 *
 * Reusable across the app - call from any script that needs a forced cloudsave.
 * Requires the game to be in a state where the top-of-screen UI is visible.
 */
export const cloudsave = async (token: CancellationToken): Promise<boolean> => {
  logger.log("cloudsave - start");

  const opened = await navigateTo(
    "ui/players/player_menu_and_cloudsave",
    "ui/players",
    undefined,
    token,
    "Players"
  );
  if (!opened) {
    return false;
  }

  const located = await locateActiveCharacter(token);
  if (!located) {
    return false;
  }
  logger.log(
    `cloudsave - active character on page ${located.page}, slot ${located.slot}`
  );

  if (!(await enterMainMenu(token))) {
    return false;
  }

  await ensureMainMenuPage(located.page, token);

  const slotIdx = located.slot - 1;
  const feet = MAIN_MENU_FEET[slotIdx];
  if (!feet) {
    logger.error(
      `cloudsave - no main-menu feet coord for slot ${located.slot}`
    );
    return false;
  }
  await backendCommand.click(feet, undefined, token);

  await backendCommand.click(MAIN_MENU_PLAY, undefined, token);

  logger.log("cloudsave - done");
  return true;
};
