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

    let passed = 0;
    let failed = 0;

    const testNavigation = async (name: string, label: string) => {
      logger.log(`${label}: Navigating to ${name}`);
      await navigateToCategory(name, backend, token, logger);

      const visible = await backend.isVisible(
        CARD_CATEGORIES.find((c) => c.categoryName === name)!.categoryImage,
        undefined,
        token
      );

      if (visible) {
        logger.log(`${label}: PASS — ${name} is visible`);
        passed++;
      } else {
        logger.log(`${label}: FAIL — ${name} not visible after navigation`);
        failed++;
      }

      await delay(5000, token);
    };

    // Test 1: Navigate to Events (deterministic)
    await testNavigation("Events", "Test 1/11");

    // Tests 2-11: Random categories
    for (let i = 0; i < 10; i++) {
      token.throwIfCancelled();
      const randomIndex = Math.floor(Math.random() * CARD_CATEGORIES.length);
      const category = CARD_CATEGORIES[randomIndex]!;
      await testNavigation(category.categoryName, `Test ${i + 2}/11`);
    }

    logger.log(
      `Navigation test complete: ${passed}/11 passed, ${failed}/11 failed`
    );
  },
});
