import { delay } from "../../utils";
import { defineScript } from "../define-script";
import { codex } from "../game-nav/codex";
import { CARD_CATEGORIES, navigateToCategory } from "./cards";

export default defineScript({
  id: "general.cardPresets.findSlot",
  name: "Card Presets - Find Slot",
  run: async ({ token, backend, logger }) => {
    const navigated = await codex.toCards(token);
    if (!navigated) {
      throw new Error("Failed to navigate to Cards");
    }

    // Test 1: Navigate to Events (deterministic)
    logger.log("Test 1/11: Navigating to Events");
    await navigateToCategory("Events", backend, token, logger);
    await delay(5000, token);

    // Tests 2-11: Random categories
    for (let i = 0; i < 10; i++) {
      token.throwIfCancelled();
      const randomIndex = Math.floor(Math.random() * CARD_CATEGORIES.length);
      const category = CARD_CATEGORIES[randomIndex]!;
      logger.log(`Test ${i + 2}/11: Navigating to ${category.categoryName}`);
      await navigateToCategory(category.categoryName, backend, token, logger);
      await delay(5000, token);
    }

    logger.log("Navigation test complete");
  },
});
