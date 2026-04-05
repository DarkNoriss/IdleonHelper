import { delay } from "../../utils/index.ts";
import { defineScript } from "../define-script.ts";
import { navigation } from "../game-nav/index.ts";

export default defineScript<[string]>({
  id: "general.candy.run",
  name: "Candy",
  run: async ({ token, backend, logger, args: [candyType] }) => {
    token.throwIfCancelled();
    logger.log(`Candy clicker: starting for candy_${candyType}...`);

    while (true) {
      token.throwIfCancelled();

      const itemsOpen = await navigation.ui.toItems(token);
      if (!itemsOpen) {
        logger.error("Failed to navigate to Items screen");
        return;
      }

      token.throwIfCancelled();
      const result = await backend.find(
        `items/candy_${candyType}`,
        { threshold: 0.96 },
        token
      );

      if (result.matches.length === 0) {
        logger.log(`No more candy_${candyType} found. Done.`);
        return;
      }

      const candyPoint = result.matches[0]!;
      logger.log(`Found candy_${candyType}, holding for 1s...`);

      token.throwIfCancelled();
      await backend.click(candyPoint, { holdTime: 1000 }, token);

      logger.log("Candy used. Waiting for Items to close...");
      await delay(500, token);
    }
  },
});
