import { backendCommand } from "../../backend/index";
import type { CancellationToken } from "../../utils/cancellation-token";
import { delay, logger } from "../../utils/index";
import { codex } from "./codex";
import { navigateTo } from "./helpers";

const PAGE_HSV_LOWER = { h: 0, s: 0, v: 128 } as const;
const PAGE_HSV_UPPER = { h: 192, s: 255, v: 255 } as const;
const PAGE_DETECT_THRESHOLD = 0.99;
// Restrict page detection to the left side of the screen (cogs panel).
// The right side has a "characters" UI element that false-matches on page-1.
const PAGE_DETECT_OFFSET = {
  left: 0,
  top: 0,
  right: 500,
  bottom: 600,
} as const;
const TOTAL_PAGES = 8;
const pagePath = (page: number): string =>
  `ui/codex/quik-ref/construction/page-${page}`;

export const construction = {
  toConstruction: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/quik-ref/construction/cogs_tab",
      "ui/codex/quik-ref/construction/construction",
      codex.toQuikRef,
      token,
      "Construction"
    );
  },
  toCogsTab: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "ui/codex/quik-ref/construction/flaggy-rate",
      "ui/codex/quik-ref/construction/cogs_tab",
      construction.toConstruction,
      token,
      "Cogs Tab"
    );
  },
  ensureFirstPage: async (token: CancellationToken): Promise<boolean> => {
    return await ensurePage(
      "ui/codex/quik-ref/construction/cogs-page-prev",
      "ui/codex/quik-ref/construction/cogs-page-prev-off",
      "first page",
      "previous button",
      token
    );
  },
  ensureLastPage: async (token: CancellationToken): Promise<boolean> => {
    return await ensurePage(
      "ui/codex/quik-ref/construction/cogs-page-next",
      "ui/codex/quik-ref/construction/cogs-page-next-off",
      "last page",
      "next button",
      token
    );
  },
  ensureCogShelfOff: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "ui/codex/quik-ref/construction/cogs-shelf-off",
      "ui/codex/quik-ref/construction/cogs-shelf",
      "cog shelf",
      "off",
      token
    );
  },
  ensureCogShelfOn: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "ui/codex/quik-ref/construction/cogs-shelf",
      "ui/codex/quik-ref/construction/cogs-shelf-off",
      "cog shelf",
      "on",
      token
    );
  },
  ensureTrashOff: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "ui/codex/quik-ref/construction/cogs-trash-off",
      "ui/codex/quik-ref/construction/cogs-trash",
      "trash",
      "off",
      token
    );
  },
  ensureTrashOn: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "ui/codex/quik-ref/construction/cogs-trash",
      "ui/codex/quik-ref/construction/cogs-trash-off",
      "trash",
      "on",
      token
    );
  },
  navigateToPage: async (
    targetPage: number,
    token: CancellationToken
  ): Promise<number> => {
    if (targetPage < 1 || targetPage > TOTAL_PAGES) {
      throw new Error(
        `Invalid target page ${targetPage} (valid range: 1-${TOTAL_PAGES})`
      );
    }

    // Single-click-then-detect loop: a double-click overshoot is corrected on
    // the next iteration instead of compounding inside a multi-click burst.
    const MAX_CLICK_ITERATIONS = 30;
    let clicks = 0;
    let lastDetected: number | null = null;

    while (clicks < MAX_CLICK_ITERATIONS) {
      token.throwIfCancelled();

      const detected = await detectCurrentPage(token);
      if (detected === null) {
        throw new Error(
          `navigateToPage - cannot detect current page (target ${targetPage}, after ${clicks} clicks)`
        );
      }

      if (detected === targetPage) {
        logger.log(
          `navigateToPage - reached page ${targetPage} (${clicks} click${clicks === 1 ? "" : "s"})`
        );
        return targetPage;
      }

      const direction = targetPage > detected ? "next" : "prev";
      const buttonImage =
        direction === "next"
          ? "ui/codex/quik-ref/construction/cogs-page-next"
          : "ui/codex/quik-ref/construction/cogs-page-prev";

      const result = await backendCommand.find(buttonImage, undefined, token);
      if (result.length === 0) {
        throw new Error(
          `navigateToPage - ${direction} button not found (target ${targetPage}, detected ${detected})`
        );
      }

      logger.log(
        `navigateToPage - on page ${detected}, target ${targetPage}, clicking ${direction}`
      );
      await backendCommand.click(result[0]!, undefined, token);
      await delay(100, token);

      lastDetected = detected;
      clicks++;
    }

    throw new Error(
      `navigateToPage - safety cap reached (${MAX_CLICK_ITERATIONS} clicks), target ${targetPage}, last detected ${lastDetected ?? "unknown"}`
    );
  },
} as const;

const detectCurrentPage = async (
  token: CancellationToken
): Promise<number | null> => {
  const images: Record<string, string> = {};
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    images[String(page)] = pagePath(page);
  }

  const results = await backendCommand.isVisibleHSVParallel(
    images,
    PAGE_HSV_LOWER,
    PAGE_HSV_UPPER,
    { threshold: PAGE_DETECT_THRESHOLD, offset: PAGE_DETECT_OFFSET },
    token
  );

  const matched: number[] = [];
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    if ((results[String(page)]?.length ?? 0) > 0) {
      matched.push(page);
    }
  }

  if (matched.length > 1) {
    logger.log(
      `detectCurrentPage - WARNING: multiple pages matched [${matched.join(",")}], returning first`
    );
  }

  return matched[0] ?? null;
};

const ensurePage = async (
  buttonImage: string,
  confirmationImage: string,
  pageName: string,
  buttonName: string,
  token: CancellationToken
): Promise<boolean> => {
  logger.log(`Ensuring we are on the ${pageName}...`);

  const isOnTargetPage = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  );
  if (isOnTargetPage.length > 0) {
    logger.log(`Already on ${pageName}`);
    return true;
  }

  const result = await backendCommand.find(buttonImage, undefined, token);

  if (result.length === 0) {
    logger.log(`${buttonName} not found, assuming we're on ${pageName}`);
    return true;
  }

  const buttonPoint = result[0]!;

  logger.log(`Clicking ${buttonName} 12 times...`);
  await backendCommand.click(
    buttonPoint,
    {
      times: 12,
      interval: 25,
      holdTime: 10,
    },
    token
  );

  const finalCheck = await backendCommand.find(
    confirmationImage,
    undefined,
    token
  );
  if (finalCheck.length > 0) {
    logger.log(`Reached ${pageName}`);
    return true;
  }

  logger.log(`Still not on ${pageName} after 12 clicks`);
  return false;
};

const ensureToggle = async (
  confirmationImage: string,
  buttonImage: string,
  itemName: string,
  targetState: string,
  token: CancellationToken
): Promise<boolean> => {
  logger.log(`Ensuring ${itemName} is ${targetState}...`);

  const isInTargetState = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  );
  if (isInTargetState.length > 0) {
    logger.log(`${itemName} is already ${targetState}`);
    return true;
  }

  const clicked = await backendCommand.findAndClick(
    buttonImage,
    undefined,
    token
  );
  if (!clicked) {
    logger.log(
      `${itemName} button not found, assuming it's already ${targetState}`
    );
    return true;
  }

  const finalCheck = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  );
  if (finalCheck.length > 0) {
    logger.log(`${itemName} is now ${targetState}`);
    return true;
  }

  logger.log(`Failed to turn ${itemName} ${targetState}`);
  return false;
};
