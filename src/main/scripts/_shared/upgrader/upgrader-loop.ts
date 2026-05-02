import type { UpgraderStep } from "@/types/upgrader";
import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import type { EnsureOpen } from "./openers";
import {
  placementFor,
  UPGRADER_CLICK_SETTLE_MS,
  UPGRADER_SCROLL_SETTLE_MS,
  UPGRADER_UI_HSV_LOWER,
  UPGRADER_UI_HSV_UPPER,
  type UpgraderGeometry,
} from "./upgrader-constants";

const CLICK_OPTIONS_15X = getClickOptionsFromPreset("1.5x");

export type UpgraderConfig = {
  ensureOpen: EnsureOpen;
  // In-game panel's total row count (visible + locked placeholders). Source
  // of truth is the skill's *_UPGRADE_DEFS.length - sets maxTopRow + scroll
  // pitch. Per-skill because tesseract has 63 rows, grimoire 55, sushi 45.
  totalRows: number;
  geometry: UpgraderGeometry;
  upgradeNameOf: (index: number) => string;
  logPrefix: string;
};

export async function runUpgraderLoop(
  steps: readonly UpgraderStep[],
  config: UpgraderConfig,
  dryRun: boolean,
  token: CancellationToken
): Promise<void> {
  if (steps.length === 0) {
    logger.log(`${config.logPrefix} - no steps, exiting`);
    return;
  }

  const dryLabel = dryRun ? " (dry-run)" : "";
  logger.log(
    `${config.logPrefix} - starting with ${steps.length} step(s)${dryLabel}`
  );

  const opened = await config.ensureOpen(token);
  if (!opened) {
    return;
  }

  let currentTopRow = 0;

  for (let i = 0; i < steps.length; i++) {
    token.throwIfCancelled();
    const step = steps[i];
    if (!step) {
      continue;
    }
    const { scrollbar, click, topRow } = placementFor(
      step.index,
      config.totalRows,
      config.geometry
    );
    const name = config.upgradeNameOf(step.index);
    const transition =
      step.fromLevel === undefined
        ? `x${step.levels}`
        : `${step.fromLevel} -> ${step.fromLevel + step.levels}`;

    logger.log(
      `${config.logPrefix} - [${i + 1}/${steps.length}] #${step.index} ${name} ${transition}`
    );

    if (topRow !== currentTopRow) {
      await backendCommand.click(scrollbar, undefined, token);
      // Required: without this settle, ~5% of consecutive scrolls fire
      // before the handle finishes animating and miss the target row.
      await delay(UPGRADER_SCROLL_SETTLE_MS, token);
      currentTopRow = topRow;
    }

    if (dryRun) {
      const shot = await backendCommand.captureHsvScreen(
        UPGRADER_UI_HSV_LOWER,
        UPGRADER_UI_HSV_UPPER,
        undefined,
        token
      );
      logger.log(
        `${config.logPrefix} - dry-run would click @ (${click.x}, ${click.y}) - screenshot ${shot.savedPath}`
      );
      continue;
    }

    await backendCommand.click(
      click,
      { ...CLICK_OPTIONS_15X, times: step.levels },
      token
    );
    await delay(UPGRADER_CLICK_SETTLE_MS, token);
  }

  logger.log(`${config.logPrefix} - finished${dryLabel}`);
}
