import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";

const TOTAL_PAGES = 8;
const ITERATIONS = 20;
const INTER_ITERATION_DELAY_MS = 150;

const pickRandomPage = (exclude: number | null): number => {
  for (let i = 0; i < 5; i++) {
    const candidate = Math.floor(Math.random() * TOTAL_PAGES) + 1;
    if (candidate !== exclude) {
      return candidate;
    }
  }
  return ((exclude ?? 0) % TOTAL_PAGES) + 1;
};

export default defineScript({
  id: "general.debug.constructionNavStress",
  name: "Debug: Construction Nav Stress",
  run: async ({ token }) => {
    logger.log("constructionNavStress - opening cogs tab");
    const opened = await navigation.construction.toCogsTab(token);
    if (!opened) {
      logger.log("constructionNavStress - failed to open cogs tab, aborting");
      return;
    }

    logger.log("constructionNavStress - ensuring cog shelf off");
    await navigation.construction.ensureCogShelfOff(token);

    logger.log("constructionNavStress - ensuring trash off");
    await navigation.construction.ensureTrashOff(token);

    let passes = 0;
    let failures = 0;
    let lastTarget: number | null = null;

    for (let i = 1; i <= ITERATIONS; i++) {
      const target = pickRandomPage(lastTarget);
      logger.log(
        `constructionNavStress - iter ${i}/${ITERATIONS} - target page ${target}`
      );

      try {
        const result = await navigation.construction.navigateToPage(
          target,
          token
        );
        if (result === target) {
          passes++;
          logger.log(
            `constructionNavStress - iter ${i} PASS - reached page ${target}`
          );
        } else {
          failures++;
          logger.log(
            `constructionNavStress - iter ${i} FAIL - target ${target}, got ${result}`
          );
        }
      } catch (err) {
        failures++;
        const message = err instanceof Error ? err.message : String(err);
        logger.log(`constructionNavStress - iter ${i} ERROR - ${message}`);
      }

      lastTarget = target;
      await delay(INTER_ITERATION_DELAY_MS, token);
    }

    logger.log(
      `constructionNavStress - done - ${passes} pass / ${failures} fail of ${ITERATIONS}`
    );
  },
});
