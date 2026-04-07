import {
  backendConfig,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend/index";
import { defineScript } from "../define-script";

export default defineScript({
  id: "world6.farming.start",
  name: "Start Farming",
  run: async ({ token, backend, logger }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Searching for farming images with threshold 99.25%...");

      const threshold = 0.9925;
      const findOptions = {
        threshold,
        timeoutMs: backendConfig.isVisible.timeoutMs,
        intervalMs: backendConfig.find.intervalMs,
      };

      const [og3Result, og4Result, og5Result] = await Promise.all([
        backend.find("farming/og-3", findOptions, token),
        backend.find("farming/og-4", findOptions, token),
        backend.find("farming/og-5", findOptions, token),
      ]);

      const allCoordinates = [...og3Result, ...og4Result, ...og5Result];

      if (allCoordinates.length === 0) {
        logger.log("No farming images found, waiting before next iteration...");
        continue;
      }

      logger.log(
        `Found ${allCoordinates.length} farming images (og-3: ${og3Result.length}, og-4: ${og4Result.length}, og-5: ${og5Result.length})`
      );

      if (og3Result.length > 0) {
        logger.log(
          `og-3 matches (${og3Result.length}): ${og3Result
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }
      if (og4Result.length > 0) {
        logger.log(
          `og-4 matches (${og4Result.length}): ${og4Result
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }
      if (og5Result.length > 0) {
        logger.log(
          `og-5 matches (${og5Result.length}): ${og5Result
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        );
      }

      const presetOptions = getClickOptionsFromPreset(ClickPreset.Extreme);
      for (const coordinate of allCoordinates) {
        token.throwIfCancelled();
        await backend.click(coordinate, presetOptions, token);
      }

      logger.log(`Clicked on ${allCoordinates.length} farming images`);
    }
  },
});
