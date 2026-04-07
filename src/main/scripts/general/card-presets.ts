import { PRESET_CONFIGS } from "../../../parsers/card-presets";
import type { Point } from "../../backend/backend-types";
import { backendCommand } from "../../backend/index";
import { logger } from "../../utils/index";
import { defineScript } from "../define-script";
import { codex } from "../game-nav/codex";
import { CARD_CATEGORIES, navigateToCategory } from "./cards";

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

const PRESET_CARDS: Record<number, string[]> = {
  1: [
    "chaotic-amarok-card",
    "boop-card",
    "demented-spiritlord-card",
    "blighted-chizoar-card",
    "clammie-card",
    "suggma-card",
    "woodlin-spirit-card",
    "sovereign-emperor-card",
  ],
  3: [
    "poop-card",
    "crystal-carrot-card",
    "mister-brightside-card",
    "minichief-spirit-card",
    "king-doot-card",
    "emperor-card",
    "coralcave-guardian-card",
    "demon-genie-card",
  ],
};

const findCardCategory = (cardName: string) => {
  for (const category of CARD_CATEGORIES) {
    const card = category.cards.find((c) => c.cardName === cardName);
    if (card) {
      return { category, card };
    }
  }
  throw new Error(`Card "${cardName}" not found in any category`);
};

export default defineScript<[number]>({
  id: "general.cardPresets.apply",
  name: "Card Presets - Apply",
  run: async ({ token, args: [slot] }) => {
    const config = PRESET_CONFIGS.find((p) => p.slot === slot);
    if (!config) {
      throw new Error(`No preset config for slot ${slot}`);
    }
    const cards = PRESET_CARDS[slot];
    if (!cards) {
      throw new Error(`No cards defined for preset slot ${slot}`);
    }
    logger.log(`Applying preset: ${config.name} (slot ${config.slot})`);

    // Step 1: Navigate to cards
    const navigated = await codex.toCards(token);
    if (!navigated) {
      throw new Error("Failed to navigate to Cards");
    }

    // Step 2: Click the preset slot
    const presetImage = `ui/codex/cards/card_preset_${config.slot}`;
    const clicked = await backendCommand.findAndClick(
      presetImage,
      undefined,
      token
    );
    if (!clicked) {
      throw new Error(`Failed to find preset slot ${config.slot}`);
    }
    logger.log(`Clicked preset slot ${config.slot}`);

    // Step 3: Clear all 8 card slots rapidly
    for (const cardSlot of CARD_SLOTS) {
      token.throwIfCancelled();
      await backendCommand.click(cardSlot, undefined, token);
    }
    logger.log("Cleared all card slots");

    // Step 4: For each card, navigate to category and findWithDebug
    for (let i = 0; i < cards.length; i++) {
      token.throwIfCancelled();
      const cardName = cards[i]!;
      const { category, card } = findCardCategory(cardName);

      logger.log(
        `Card ${i + 1}/${cards.length}: ${cardName} in ${category.categoryName}`
      );

      // Navigate to the card's category
      await navigateToCategory(category.categoryName, token);

      // Debug: find the card image
      const result = await backendCommand.findWithDebug(
        card.cardImage,
        undefined,
        token
      );

      if (result.debugImagePath) {
        logger.log(`Debug image: ${result.debugImagePath}`);
      }

      if (result.matches.length === 0) {
        logger.log("  Not found on screen");
      } else {
        for (const match of result.matches) {
          logger.log(
            `  Match: (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(3)}`
          );
        }
      }
    }

    logger.log(`Preset ${config.name}: debug scan complete`);
  },
});
