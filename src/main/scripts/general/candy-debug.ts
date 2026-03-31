import { defineScript } from "../define-script";
import { navigation } from "../game-nav";

export default defineScript<[string]>({
  id: "general.candy.debug",
  name: "Candy Debug",
  run: async ({ token, backend, logger, args: [candyType] }) => {
    token.throwIfCancelled();
    logger.log(`Candy debug: scanning for candy_${candyType}...`);

    const itemsOpen = await navigation.ui.toItems(token);
    if (!itemsOpen) {
      logger.error("Failed to navigate to Items screen");
      return;
    }

    token.throwIfCancelled();
    logger.log(`Running debug find for items/candy_${candyType}...`);
    const result = await backend.find(
      `items/candy_${candyType}`,
      { debug: true },
      token
    );

    logger.log(
      `Debug scan complete: ${result.matches.length} match(es) for candy_${candyType}`
    );
  },
});
