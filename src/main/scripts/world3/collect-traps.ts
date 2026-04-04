import { setState } from "../../state-hub";
import { delay } from "../../utils";
import { defineScript } from "../define-script";

const ARROW_DOWN_MAX_ATTEMPTS = 3;
const VK_ESCAPE = 0x1b;
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

export default defineScript<[string, string]>({
  id: "world3.trapping.collectTraps",
  name: "Collect Traps",
  run: async ({ token, backend, logger, args: [_trapType, timer] }) => {
    const intervalMs = parseTimerToMs(timer);
    logger.log(`Collect Traps: looping every ${timer} (${intervalMs}ms)`);

    try {
      while (true) {
        token.throwIfCancelled();
        setState("collectTraps", { endsAt: null });

        // Step 1: Find and open Eagle Eye
        // Try fast path first: quick visibility checks before slow findAndClick
        logger.log("Looking for Eagle Eye skill...");
        let eagleEyeFound = false;

        const quickFindEagleEye = async (): Promise<boolean> => {
          if (
            await backend.isVisible(
              "ui/attacks/attack_eagle_eye",
              undefined,
              token
            )
          ) {
            return backend.findAndClick(
              "ui/attacks/attack_eagle_eye",
              { timeoutMs: 1000 },
              token
            );
          }
          return false;
        };

        const scrollAndFindEagleEye = async (): Promise<boolean> => {
          for (let i = 0; i < ARROW_DOWN_MAX_ATTEMPTS; i++) {
            token.throwIfCancelled();
            logger.log(
              `Scrolling down attack bar (${i + 1}/${ARROW_DOWN_MAX_ATTEMPTS})...`
            );
            if (
              await backend.isVisible(
                "ui/attacks/attack_arrow_down",
                undefined,
                token
              )
            ) {
              await backend.findAndClick(
                "ui/attacks/attack_arrow_down",
                { timeoutMs: 1000 },
                token
              );
              await delay(200, token);
              const found = await quickFindEagleEye();
              if (found) {
                return true;
              }
            }
          }
          return false;
        };

        // Fast: check if eagle eye is already visible
        eagleEyeFound = await quickFindEagleEye();

        // Fast: scroll through attack bar rows
        if (!eagleEyeFound) {
          eagleEyeFound = await scrollAndFindEagleEye();
        }

        // Slow fallback: open attacks bar, then retry
        if (!eagleEyeFound) {
          logger.log("Eagle Eye not found. Opening attacks bar...");
          const attacksClicked = await backend.findAndClick(
            "ui/attacks/attacks",
            { timeoutMs: 3000 },
            token
          );

          if (attacksClicked) {
            await delay(500, token);
            eagleEyeFound = await quickFindEagleEye();

            if (!eagleEyeFound) {
              eagleEyeFound = await scrollAndFindEagleEye();
            }
          }
        }

        if (!eagleEyeFound) {
          throw new Error("Eagle Eye skill not found on attack bar");
        }

        await delay(500, token);

        // Step 2: Collect traps
        logger.log("Looking for Collect All button...");
        const collected = await backend.findAndClick(
          "trapping/trapping_collect_all",
          { timeoutMs: 5000 },
          token
        );

        if (collected) {
          await delay(500, token);

          // Step 3: Close
          logger.log("Closing with Escape...");
          await backend.keyPress(VK_ESCAPE, undefined, token);
          await delay(300, token);
        } else {
          const isOff = await backend.isVisible(
            "trapping/trapping_collect_all_off",
            undefined,
            token
          );

          if (isOff) {
            logger.log("Collecting not available yet!");
            await backend.keyPress(VK_ESCAPE, undefined, token);
            await delay(300, token);
          } else {
            await backend.keyPress(VK_ESCAPE, undefined, token);
            throw new Error("Collect All button not found");
          }
        }

        // Step 4: Wait for next cycle
        const totalWaitMs = intervalMs + TIMER_HEADROOM_MS;
        setState("collectTraps", { endsAt: Date.now() + totalWaitMs });
        logger.log(`Waiting ${timer} + 3s headroom until next collection...`);
        await delay(totalWaitMs, token);
      }
    } finally {
      setState("collectTraps", { endsAt: null });
    }
  },
});
