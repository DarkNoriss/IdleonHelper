import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { navigateToHSV } from "../../game-nav/helpers";
import { W6_BOSS_HSV } from "./constants";

export const openBossBanner = async (
  token: CancellationToken
): Promise<boolean> => {
  return await navigateToHSV(
    "world6/boss/banner_header",
    "world6/boss/banner",
    W6_BOSS_HSV,
    undefined,
    token,
    "W6 Boss Banner"
  );
};

export const clickBannerReset = async (
  token: CancellationToken
): Promise<boolean> => {
  const matches = await backendCommand.findHSV(
    "world6/boss/banner_reset",
    W6_BOSS_HSV.hsvLower,
    W6_BOSS_HSV.hsvUpper,
    undefined,
    token
  );
  if (matches.length === 0) {
    logger.error("Banner reset button not found");
    return false;
  }
  await backendCommand.click(matches[0]!, undefined, token);
  logger.log("Clicked banner reset");
  return true;
};
