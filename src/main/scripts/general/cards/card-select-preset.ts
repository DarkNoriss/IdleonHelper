import { PRESET_CONFIGS } from "../../../../parsers/card-presets";
import {
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../../backend/backend-config";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { codex } from "../../game-nav/codex";
import { pressKey } from "../../keys";

export default defineScript<[number]>({
  id: "general.cardPresets.select",
  name: "Card Presets - Select Set",
  run: async ({ token, args: [slot] }) => {
    const config = PRESET_CONFIGS.find((p) => p.slot === slot);
    if (!config) {
      throw new Error(`No preset config for slot ${slot}`);
    }
    if (!config.setImage) {
      throw new Error(`No set image defined for preset ${config.name}`);
    }
    logger.log(`Selecting card set for preset: ${config.name}`);

    // Step 1: Navigate to cards
    const navigated = await codex.toCards(token);
    if (!navigated) {
      throw new Error("Failed to navigate to Cards");
    }

    // Step 2: Open card sets panel
    const setsClicked = await backendCommand.findAndClick(
      "ui/codex/cards/card_sets",
      undefined,
      token
    );
    if (!setsClicked) {
      throw new Error("Failed to click card sets tab");
    }

    const setsOpen = await backendCommand.find(
      "ui/codex/cards/card_set_equip",
      undefined,
      token
    );
    if (setsOpen.length === 0) {
      throw new Error("Card sets panel did not open");
    }
    logger.log("Card sets panel open");

    // Step 3: Reset to page 1 with 10 fast clicks on prev
    const prevMatches = await backendCommand.isVisible(
      "ui/codex/cards/cards_set_prev",
      undefined,
      token
    );
    if (prevMatches.length > 0) {
      const fastClick = getClickOptionsFromPreset(ClickPreset.Fast);
      for (let i = 0; i < 10; i++) {
        token.throwIfCancelled();
        await backendCommand.click(prevMatches[0]!, fastClick, token);
      }
    }
    logger.log("Reset to page 1");

    // Step 4: Find the target set (loop up to 6 pages)
    let foundPoint: { x: number; y: number } | undefined;
    for (let page = 0; page < 6; page++) {
      token.throwIfCancelled();
      const matches = await backendCommand.isVisible(
        config.setImage,
        undefined,
        token
      );
      if (matches.length > 0) {
        foundPoint = matches[0]!;
        logger.log(
          `Found set on page ${page + 1} at (${foundPoint.x}, ${foundPoint.y})`
        );
        break;
      }
      await backendCommand.findAndClick(
        "ui/codex/cards/cards_set_next",
        undefined,
        token
      );
    }

    if (!foundPoint) {
      logger.log("Set not found after 6 pages - closing menu");
      await pressKey("ESCAPE", token);
      return;
    }

    // Step 5: Check if already active, activate if not
    const activatePoint = { x: foundPoint.x + 40, y: foundPoint.y };
    const activeMatches = await backendCommand.isVisible(
      "ui/codex/cards/card_set_active",
      undefined,
      token
    );
    const alreadyActive = activeMatches.some(
      (match) => Math.abs(match.x - activatePoint.x) < 30
    );

    if (alreadyActive) {
      logger.log("Set already active - skipping");
    } else {
      await backendCommand.click(activatePoint, undefined, token);
      logger.log("Activated card set");
    }

    // Step 6: Close menu
    await pressKey("ESCAPE", token);
    logger.log(`Card set for ${config.name} selected`);
  },
});
