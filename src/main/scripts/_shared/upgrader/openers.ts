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

// Sushi: caller is already in the sushi-station UI but may be on a different
// inner tab. The image is the inactive-tab graphic - if visible, click it to
// switch to the upgrade tab; if absent, we're already on it. Uses
// isVisibleHSV (short timeout) so the happy path is a fast no-op.
export const inactiveTabOpener = (
  inactiveTabImage: string,
  logPrefix: string
): EnsureOpen => {
  return async (token) => {
    const tabHits = await backendCommand.isVisibleHSV(
      inactiveTabImage,
      UPGRADER_UI_HSV_LOWER,
      UPGRADER_UI_HSV_UPPER,
      undefined,
      token
    );
    if (tabHits.length > 0) {
      logger.log(`${logPrefix} - inactive tab visible, clicking to activate`);
      await backendCommand.click(tabHits[0]!, undefined, token);
    }
    return true;
  };
};
