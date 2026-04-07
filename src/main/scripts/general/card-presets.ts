import type { Point } from "@/types/backend-types";
import { defineScript } from "../define-script";
import { codex } from "../game-nav/codex";

const FIRST_CARD_CATEGORY = { x: 471, y: 173 };
const CARD_SLOTS: Point[] = [
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
  run: async ({ token, logger }) => {
    const navigated = await codex.toCards(token);
    if (!navigated) {
      throw new Error("Failed to navigate to Cards");
    }

    logger.log(
      `First card category: ${FIRST_CARD_CATEGORY.x}, ${FIRST_CARD_CATEGORY.y}`
    );
    logger.log(`Card slots: ${CARD_SLOTS.length}`);

    logger.log("Card debug: done");
  },
});
