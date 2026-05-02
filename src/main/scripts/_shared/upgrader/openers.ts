import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { navigation } from "../../game-nav/index";
import {
  UPGRADER_UI_HSV_LOWER,
  UPGRADER_UI_HSV_UPPER,
} from "./upgrader-constants";

export type EnsureOpen = (token: CancellationToken) => Promise<boolean>;

// Existing skills (tesseract, grimoire): start from the attack-skill picker,
// then verify the panel header is visible.
export const attackSkillOpener = (
  attackIcon: string,
  headerImage: string,
  skillName: string,
  logPrefix: string
): EnsureOpen => {
  return async (token) => {
    const opened = await navigation.findAttackSkill(
      attackIcon,
      token,
      skillName
    );
    if (!opened) {
      logger.log(`${logPrefix} - ${skillName} skill not found - aborting`);
      return false;
    }
    const headerVisible = await backendCommand.findHSV(
      headerImage,
      UPGRADER_UI_HSV_LOWER,
      UPGRADER_UI_HSV_UPPER,
      undefined,
      token
    );
    if (headerVisible.length === 0) {
      logger.log(`${logPrefix} - panel header not found - aborting`);
      return false;
    }
    return true;
  };
};

// Sushi: caller is already in the sushi-station UI; we only need to verify the
// upgrade panel header is on screen.
export const headerOpener = (
  headerImage: string,
  logPrefix: string
): EnsureOpen => {
  return async (token) => {
    const headerVisible = await backendCommand.findHSV(
      headerImage,
      UPGRADER_UI_HSV_LOWER,
      UPGRADER_UI_HSV_UPPER,
      undefined,
      token
    );
    if (headerVisible.length === 0) {
      logger.log(`${logPrefix} - panel header not found - aborting`);
      return false;
    }
    return true;
  };
};
