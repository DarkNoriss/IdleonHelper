import { backendCommand } from "../../../backend/index";
import { setState } from "../../../state-hub";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";
import { pressKey } from "../../keys";

const TIMER_HEADROOM_MS = 3000;

const parseTimerToMs = (timer: string): number => {
  const match = timer.match(/^(\d+)([mhd])$/);
  if (!match) {
    throw new Error(`Invalid timer format: ${timer}`);
  }

  const value = Number.parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown timer unit: ${unit}`);
  }
};

const intervalFromTimer = (timer: string): number =>
  parseTimerToMs(timer) + TIMER_HEADROOM_MS;

export default defineScript<[string]>({
  id: "world3.trapping.collectTraps",
  name: "Collect Traps",
  recurring: {
    intervalFromArgs: ([timer]) => intervalFromTimer(timer),
  },
  run: async ({ token, args: [timer] }) => {
    const intervalMs = intervalFromTimer(timer);
    logger.log(`collect-traps - iteration (next in ${timer} + 3s headroom)`);

    setState("collectTraps", { endsAt: null });

    try {
      const eagleEyeFound = await navigation.findAttackSkill(
        "ui/attacks/attack_eagle_eye",
        token,
        "Eagle Eye"
      );

      if (!eagleEyeFound) {
        throw new Error("Eagle Eye skill not found on attack bar");
      }

      await delay(500, token);

      logger.log("Looking for Collect All button...");
      const collected = await backendCommand.findAndClick(
        "trapping/trapping_collect_all",
        undefined,
        token
      );

      if (collected) {
        await delay(500, token);
        logger.log("Closing with Escape...");
        await pressKey("ESCAPE", token);
        await delay(300, token);
      } else {
        const isOff = await backendCommand.isVisible(
          "trapping/trapping_collect_all_off",
          undefined,
          token
        );
        if (isOff.length > 0) {
          logger.log("Collecting not available yet!");
          await pressKey("ESCAPE", token);
          await delay(300, token);
        } else {
          await pressKey("ESCAPE", token);
          throw new Error("Collect All button not found");
        }
      }
    } finally {
      // Clear countdown when cancelled (pause or user remove) so stale timers
      // do not keep ticking. Otherwise show time until next iteration.
      setState("collectTraps", {
        endsAt: token.isCancelled() ? null : Date.now() + intervalMs,
      });
    }
  },
});
