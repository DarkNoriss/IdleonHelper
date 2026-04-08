import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";

const DEBUG_IMAGES = [
  { name: "inventory_center", path: "ui/items/inventory_center" },
  { name: "storage_center", path: "ui/codex/quik-ref/storage/storage_center" },
  {
    name: "storage_small_mode",
    path: "ui/codex/quik-ref/storage/storage_small_mode",
  },
  {
    name: "storage_small_mode_off",
    path: "ui/codex/quik-ref/storage/storage_small_mode_off",
  },
  {
    name: "storage_split_stack",
    path: "ui/codex/quik-ref/storage/storage_split_stack",
  },
  {
    name: "storage_split_stack_off",
    path: "ui/codex/quik-ref/storage/storage_split_stack_off",
  },
];

export default defineScript({
  id: "world6.farming.beanTradingDebug",
  name: "Bean Trading - Debug",
  run: async ({ token }) => {
    token.throwIfCancelled();
    logger.log("bean-trading-debug - navigating to storage");
    await navigation.quickRef.toStorage(token);

    for (const image of DEBUG_IMAGES) {
      token.throwIfCancelled();
      logger.log(`bean-trading-debug - scanning: ${image.name}`);
      const result = await backendCommand.findWithDebug(
        image.path,
        undefined,
        token
      );

      if (result.debugImagePath) {
        logger.log(
          `bean-trading-debug - debug image: ${result.debugImagePath}`
        );
      }

      if (result.matches.length === 0) {
        logger.log(`bean-trading-debug - ${image.name}: no matches found`);
      } else {
        for (const match of result.matches) {
          logger.log(
            `bean-trading-debug - ${image.name}: (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(3)}`
          );
        }
      }
    }

    logger.log("bean-trading-debug - done");
  },
});
