import { backendCommand } from "../../../backend/index";
import { setState } from "../../../state-hub";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const INITIAL_STATE = {
  avgIterationMs: 0,
  estimatedRemainingMs: 0,
};

export default defineScript<[number]>({
  id: "general.bossFarmer.run",
  name: "Boss Farmer",
  run: async ({ token, args: [totalIterations] }) => {
    const total = totalIterations;

    logger.log(`Boss Farmer: starting ${total} iterations...`);
    setState("bossFarmer", {
      iteration: 0,
      total,
      running: true,
      ...INITIAL_STATE,
    });

    let lastClickTime = 0;
    let totalTimedMs = 0;
    let timedIterations = 0;

    try {
      for (let i = 0; i < total; i++) {
        token.throwIfCancelled();

        logger.log(`Iteration ${i + 1}/${total}: waiting for repeat image...`);
        const result = await backendCommand.find(
          "general/repeat",
          { timeoutMs: 120_000, intervalMs: 225 },
          token
        );

        if (result.length === 0) {
          logger.error("Repeat image not found within timeout. Stopping.");
          return;
        }

        const matchPoint = result[0]!;
        logger.log("Found repeat image. Waiting 5s for loot...");

        token.throwIfCancelled();
        await delay(5000, token);

        if (i < total - 1) {
          logger.log(`Clicking to start fight ${i + 2}...`);
          token.throwIfCancelled();
          await backendCommand.click(matchPoint, {}, token);
          await delay(500, token);

          const now = Date.now();
          if (lastClickTime > 0) {
            totalTimedMs += now - lastClickTime;
            timedIterations++;
          }
          lastClickTime = now;
        } else {
          logger.log("Last iteration complete. Skipping click.");
        }

        const remaining = total - (i + 1);
        let timing = INITIAL_STATE;

        if (timedIterations > 0) {
          const avgIterationMs = totalTimedMs / timedIterations;
          timing = {
            avgIterationMs,
            estimatedRemainingMs: avgIterationMs * remaining,
          };
        }

        setState("bossFarmer", {
          iteration: i + 1,
          total,
          running: true,
          ...timing,
        });
      }

      logger.log(`Boss Farmer: all ${total} iterations complete.`);
    } finally {
      setState("bossFarmer", {
        iteration: 0,
        total: 0,
        running: false,
        ...INITIAL_STATE,
      });
    }
  },
});
