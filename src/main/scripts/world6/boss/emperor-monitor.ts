import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import {
  EMPEROR_DEAD_CONFIRMS,
  EMPEROR_POLL_MS,
  W6_BOSS_HSV,
} from "./constants";

export const waitForEmperorDead = async (
  token: CancellationToken
): Promise<void> => {
  logger.log("Waiting for emperor to die...");

  let consecutiveMisses = 0;
  while (consecutiveMisses < EMPEROR_DEAD_CONFIRMS) {
    token.throwIfCancelled();
    const visible = await backendCommand.isVisibleHSV(
      "world6/boss/emperor",
      W6_BOSS_HSV.hsvLower,
      W6_BOSS_HSV.hsvUpper,
      undefined,
      token
    );
    if (visible.length > 0) {
      consecutiveMisses = 0;
    } else {
      consecutiveMisses += 1;
    }
    await delay(EMPEROR_POLL_MS, token);
  }

  logger.log(
    `Emperor confirmed dead after ${EMPEROR_DEAD_CONFIRMS} consecutive misses`
  );
};
