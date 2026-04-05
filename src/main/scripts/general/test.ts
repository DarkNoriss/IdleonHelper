import { defineScript } from "../define-script";
import { navigation } from "../game-nav/index";

export default defineScript({
  id: "general.test.run",
  name: "Test",
  run: async ({ token, logger }) => {
    token.throwIfCancelled();
    logger.log("Test script: navigating to Codex...");
    await navigation.ui.toCodex(token);

    token.throwIfCancelled();
    logger.log("Test script: navigating to Items...");
    await navigation.ui.toItems(token);
  },
});
