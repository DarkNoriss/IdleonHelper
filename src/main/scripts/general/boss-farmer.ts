import { setState } from "../../state-hub";
import { delay } from "../../utils";
import { defineScript } from "../define-script";

const INITIAL_STATE = {
  avgIterationMs: 0,
  estimatedRemainingMs: 0,
};

export default defineScript<[number]>({
  id: "general.bossFarmer.run",
  name: "Boss Farmer",
  run: async ({ token, backend, logger, args: [totalIterations] }) => {
    const total = totalIterations;

    logger.log(`Boss Farmer: starting ${total} iterations...`);
    setState("bossFarmer", {
      iteration: 0,
      total,
      running: true,
      ...INITIAL_STATE,
    });

    let timingStart = 0;

    try {
      for (let i = 0; i < total; i++) {
        token.throwIfCancelled();

        logger.log(`Iteration ${i + 1}/${total}: waiting for repeat image...`);
        const result = await backend.find(
          "general/repeat",
          { timeoutMs: 120_000, intervalMs: 225 },
          token
        );

        if (result.matches.length === 0) {
          logger.error("Repeat image not found within timeout. Stopping.");
          return;
        }

        const matchPoint = result.matches[0]!;
        logger.log("Found repeat image. Waiting 5s for loot...");

        token.throwIfCancelled();
        await delay(5000, token);

        const remaining = total - (i + 1);
        let timing = INITIAL_STATE;

        if (timingStart > 0 && i > 0) {
          const elapsed = Date.now() - timingStart;
          const avgIterationMs = Math.round(elapsed / i);
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

        if (i < total - 1) {
          logger.log(`Clicking to start fight ${i + 2}...`);
          token.throwIfCancelled();
          await backend.click(matchPoint, {}, token);

          if (i === 0) {
            timingStart = Date.now();
          }
        } else {
          logger.log("Last iteration complete. Skipping click.");
        }
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
