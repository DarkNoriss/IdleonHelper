import { setState } from "../../state-hub";
import { delay } from "../../utils";
import { defineScript } from "../define-script";

export default defineScript<[number]>({
  id: "general.bossFarmer.run",
  name: "Boss Farmer",
  run: async ({ token, backend, logger, args: [totalIterations] }) => {
    const total = totalIterations;

    logger.log(`Boss Farmer: starting ${total} iterations...`);
    setState("bossFarmer", { iteration: 0, total, running: true });

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

        setState("bossFarmer", { iteration: i + 1, total, running: true });

        if (i < total - 1) {
          logger.log(`Clicking to start fight ${i + 2}...`);
          token.throwIfCancelled();
          await backend.click(matchPoint, {}, token);
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
      });
    }
  },
});
