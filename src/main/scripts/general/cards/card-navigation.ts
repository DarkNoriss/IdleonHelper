import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import {
  CARD_CATEGORIES,
  CARD_CATEGORY_BOTTOM,
  CARD_CATEGORY_TOP,
} from "./card-categories";

const MAX_SCROLL_ATTEMPTS = 20;

const findVisibleCategory = async (
  token: CancellationToken
): Promise<{ index: number; categoryName: string } | undefined> => {
  for (let i = 0; i < CARD_CATEGORIES.length; i++) {
    const category = CARD_CATEGORIES[i]!;
    const visible = await backendCommand.isVisible(
      category.categoryImage,
      undefined,
      token
    );
    if (visible.length > 0) {
      return { index: i, categoryName: category.categoryName };
    }
  }
  return undefined;
};

export const navigateToCategory = async (
  categoryName: string,
  token: CancellationToken
): Promise<void> => {
  const targetIndex = CARD_CATEGORIES.findIndex(
    (c) => c.categoryName === categoryName
  );
  if (targetIndex === -1) {
    throw new Error(`Unknown card category: ${categoryName}`);
  }

  const target = CARD_CATEGORIES[targetIndex]!;

  for (let attempt = 0; attempt < MAX_SCROLL_ATTEMPTS; attempt++) {
    token.throwIfCancelled();

    // Check if target is already visible
    const targetVisible = await backendCommand.isVisible(
      target.categoryImage,
      undefined,
      token
    );

    if (targetVisible.length > 0) {
      // Find exact position and drag to top
      const found = await backendCommand.find(
        target.categoryImage,
        undefined,
        token
      );
      if (found.length > 0) {
        const match = found[0]!;
        logger.log(
          `Found ${categoryName} at (${match.x}, ${match.y}), dragging to top`
        );
        await backendCommand.drag(
          match,
          CARD_CATEGORY_TOP,
          { instant: true },
          token
        );
      }
      return;
    }

    // Find any visible category as reference
    const reference = await findVisibleCategory(token);
    if (!reference) {
      throw new Error("No card category visible on screen");
    }

    logger.log(
      `Reference: ${reference.categoryName} (index ${reference.index}), target: ${categoryName} (index ${targetIndex})`
    );

    // Scroll toward target
    if (targetIndex > reference.index) {
      // Target is below — drag bottom to top (scroll down)
      await backendCommand.drag(
        CARD_CATEGORY_BOTTOM,
        CARD_CATEGORY_TOP,
        { instant: true },
        token
      );
    } else {
      // Target is above — drag top to bottom (scroll up)
      await backendCommand.drag(
        CARD_CATEGORY_TOP,
        CARD_CATEGORY_BOTTOM,
        { instant: true },
        token
      );
    }
  }

  throw new Error(
    `Failed to find ${categoryName} after ${MAX_SCROLL_ATTEMPTS} scroll attempts`
  );
};
