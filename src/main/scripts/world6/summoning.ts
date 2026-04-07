import { delay, logger } from "../../utils/index";
import { defineScript } from "../define-script";

export const summoningStartEndless = defineScript({
  id: "world6.summoning.startEndlessAutobattler",
  name: "Endless Autobattler",
  run: async ({ token }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Endless autobattler iteration...");
      await delay(60_000, token);
    }
  },
});

export const summoningStartAutobattler = defineScript({
  id: "world6.summoning.startAutobattler",
  name: "Autobattler",
  run: async ({ token }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Autobattler iteration...");
      await delay(60_000, token);
    }
  },
});
