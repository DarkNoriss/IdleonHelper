import { backendCommand } from "../../../backend/index";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";

export default defineScript<[string]>({
  id: "general.candy.run",
  name: "Candy",
  run: async ({ token, args: [candyType] }) => {
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
      const result = await backendCommand.find(
        `items/candy_${candyType}`,
        { threshold: 0.96 },
        token
      );

      if (result.length === 0) {
        logger.log(`No more candy_${candyType} found. Done.`);
        return;
      }

      const candyPoint = result[0]!;
      logger.log(`Found candy_${candyType}, holding for 205ms...`);

      token.throwIfCancelled();
      await backendCommand.click(candyPoint, { holdTime: 205 }, token);

      logger.log("Candy used. Waiting for Items to close...");
      await delay(100, token);
    }
  },
});
