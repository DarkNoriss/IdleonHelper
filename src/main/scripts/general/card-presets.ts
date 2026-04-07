import type { Point } from "@/types/backend-types";
import { defineScript } from "../define-script";
import { codex } from "../game-nav/codex";

const _CARD_CATEGORY_TOP = { x: 471, y: 173 };
const _CARD_SLOTS: Point[] = [
  { x: 702, y: 363 },
  { x: 770, y: 363 },
  { x: 838, y: 363 },
  { x: 906, y: 363 },
  { x: 702, y: 453 },
  { x: 770, y: 453 },
  { x: 838, y: 453 },
  { x: 906, y: 453 },
];

export default defineScript({
  id: "general.cardPresets.findSlot",
  name: "Card Presets - Find Slot",
  run: async ({ token, backend, logger }) => {
    const navigated = await codex.toCards(token);
    if (!navigated) {
      throw new Error("Failed to navigate to Cards");
    }

    const result = await backend.findWithDebug(
      "codex/cards/cards_medium_resources",
      undefined,
      token
    );

    for (const match of result.matches) {
      logger.log(
        `medium_resources found at: (${match.point.x}, ${match.point.y}) similarity: ${match.similarity}`
      );
    }

    if (result.matches.length === 0) {
      logger.log("medium_resources not found on screen");
    }

    logger.log("Card debug: done");
  },
});
