import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import {
  CARD_CATEGORIES,
  CARD_CATEGORY_BOTTOM,
  CARD_CATEGORY_TOP,
} from "./card-categories";

const MAX_SCROLL_ATTEMPTS = 20;

// Initial scan - find any visible category to determine where we are.
// This is the slowest part since we don't know our position.
const findCurrentCategory = async (
  token: CancellationToken
): Promise<number> => {
  for (let i = 0; i < CARD_CATEGORIES.length; i++) {
    const category = CARD_CATEGORIES[i]!;
    const visible = await backendCommand.isVisible(
      category.categoryImage,
      undefined,
      token
    );
    if (visible.length > 0) {
      return i;
    }
  }
  throw new Error("No card category visible on screen");
};

// Find a category's position and drag it to the anchor point
const dragCategory = async (
  index: number,
  anchor: typeof CARD_CATEGORY_TOP,
  token: CancellationToken
): Promise<void> => {
  const category = CARD_CATEGORIES[index]!;
  const found = await backendCommand.find(
    category.categoryImage,
    undefined,
    token
  );
  if (found.length === 0) {
    throw new Error(`Category ${category.categoryName} not found on screen`);
  }
  const point = found[0]!;
  logger.log(
    `Dragging ${category.categoryName} from (${point.x}, ${point.y}) to anchor`
  );
  await backendCommand.drag(point, anchor, { instant: true }, token);
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

  // Find where we are (slow initial scan)
  const currentIndex = await findCurrentCategory(token);
  logger.log(
    `Current: ${CARD_CATEGORIES[currentIndex]!.categoryName} (${currentIndex}), target: ${categoryName} (${targetIndex})`
  );

  if (currentIndex === targetIndex) {
    // Already visible, drag to top
    await dragCategory(targetIndex, CARD_CATEGORY_TOP, token);
    return;
  }

  const scrollDown = targetIndex > currentIndex;
  const step = scrollDown ? 1 : -1;

  // Step through categories one by one toward the target
  for (let i = currentIndex; i !== targetIndex; i += step) {
    token.throwIfCancelled();

    // Drag current category out of the way to reveal the next one
    if (scrollDown) {
      await dragCategory(i, CARD_CATEGORY_TOP, token);
    } else {
      await dragCategory(i, CARD_CATEGORY_BOTTOM, token);
    }

    // Wait for next category to appear
    const nextIndex = i + step;
    const nextCategory = CARD_CATEGORIES[nextIndex]!;
    let found = false;

    for (let attempt = 0; attempt < MAX_SCROLL_ATTEMPTS; attempt++) {
      const visible = await backendCommand.isVisible(
        nextCategory.categoryImage,
        undefined,
        token
      );
      if (visible.length > 0) {
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(
        `Failed to find ${nextCategory.categoryName} after scrolling`
      );
    }
  }

  // Target is now visible, drag to top and click to deselect any accidental selection
  await dragCategory(targetIndex, CARD_CATEGORY_TOP, token);

  await backendCommand.findAndClick(
    CARD_CATEGORIES[targetIndex]!.categoryImage,
    undefined,
    token
  );
};
