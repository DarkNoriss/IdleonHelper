import { PRESET_CONFIGS } from "../../../../parsers/card-presets";
import { getClickOptionsFromPreset } from "../../../backend/backend-config";
import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { codex } from "../../game-nav/codex";
import { CARD_CATEGORIES } from "./card-categories";
import { navigateToCategory } from "./card-navigation";

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
  2: [
    "chaotic-amarok-card",
    "mama-troll-card",
    "bunny-card",
    "blighted-chizoar-card",
    "river-spirit-card",
    "tremor-wurm-card",
    "stilted-seeker-card",
    "chaotic-troll-card",
  ],
  3: [
    "poop-card",
    "mantaray-card",
    "mister-brightside-card",
    "minichief-spirit-card",
    "king-doot-card",
    "emperor-card",
    "coralcave-guardian-card",
    "demon-genie-card",
  ],
  4: [
    "chaotic-emperor-card",
    "blitzkrieg-troll-card",
    "dr-defecaus-card",
    "sprout-spirit-card",
    "citringe-card",
    "snowman-card",
    "bloodbone-card",
    "doodlefish-card",
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
  name: "Card Presets - Apply Preset",
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
    const fastClick = getClickOptionsFromPreset("2x");
    for (const cardSlot of CARD_SLOTS) {
      token.throwIfCancelled();
      await backendCommand.click(cardSlot, fastClick, token);
    }
    logger.log("Cleared all card slots");

    // Step 4: For each card, navigate to category, find it, and click twice to equip
    let currentCategoryIndex: number | undefined;
    for (let i = 0; i < cards.length; i++) {
      token.throwIfCancelled();
      const cardName = cards[i]!;
      const { category, card } = findCardCategory(cardName);

      logger.log(
        `Card ${i + 1}/${cards.length}: ${cardName} in ${category.categoryName}`
      );

      currentCategoryIndex = await navigateToCategory(
        category.categoryName,
        token,
        currentCategoryIndex
      );

      const result = await backendCommand.findWithDebug(
        card.cardImage,
        undefined,
        token
      );

      if (result.matches.length === 0) {
        logger.log("  Not found on screen - skipping");
        continue;
      }

      for (const match of result.matches) {
        logger.log(
          `  match: (${match.point.x}, ${match.point.y}) similarity=${match.similarity.toFixed(4)}`
        );
      }

      // Pick best match: if expectedX is set, prefer the closest by X
      let bestPoint = result.matches[0]!.point;
      if (card.expectedX !== undefined && result.matches.length > 1) {
        bestPoint = result.matches.reduce((best, m) =>
          Math.abs(m.point.x - card.expectedX!) <
          Math.abs(best.point.x - card.expectedX!)
            ? m
            : best
        ).point;
        logger.log(
          `  ${result.matches.length} matches - picked (${bestPoint.x}, ${bestPoint.y}) by expectedX=${card.expectedX}`
        );
      }

      // Click twice to add card to preset
      await backendCommand.click(bestPoint, undefined, token);
      await backendCommand.click(bestPoint, undefined, token);
      logger.log(`  Equipped ${cardName}`);
    }

    logger.log(`Preset ${config.name}: applied successfully`);
  },
});
