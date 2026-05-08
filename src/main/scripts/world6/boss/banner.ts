import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { W6_BOSS_HSV } from "./constants";

export const openBossBanner = async (
  token: CancellationToken
): Promise<boolean> => {
  logger.log("Looking for W6 Boss Banner...");

  const initial = await backendCommand.isVisibleHSVParallel(
    {
      header: "world6/boss/banner_header",
      banner: "world6/boss/banner",
    },
    W6_BOSS_HSV.hsvLower,
    W6_BOSS_HSV.hsvUpper,
    undefined,
    token
  );

  if ((initial.header ?? []).length > 0) {
    logger.log("W6 Boss Banner already open");
    return true;
  }

  if ((initial.banner ?? []).length === 0) {
    logger.error("W6 Boss Banner button not found in mask");
    return false;
  }

  await backendCommand.click(initial.banner![0]!, undefined, token);
  logger.log("Clicked W6 Boss Banner");

  const confirmed = await backendCommand.findHSV(
    "world6/boss/banner_header",
    W6_BOSS_HSV.hsvLower,
    W6_BOSS_HSV.hsvUpper,
    undefined,
    token
  );

  if (confirmed.length > 0) {
    logger.log("W6 Boss Banner opened");
    return true;
  }

  logger.error("W6 Boss Banner did not open after click");
  return false;
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
  await backendCommand.click(matches[0]!, { times: 2 }, token);
  logger.log("Double-clicked banner reset");
  return true;
};
