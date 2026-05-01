import type { UpgraderStep } from "@/types/upgrader";
import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { navigation } from "../../game-nav/index";
import {
  placementFor,
  UPGRADER_CLICK_SETTLE_MS,
  UPGRADER_SCROLL_SETTLE_MS,
  UPGRADER_UI_HSV_LOWER,
  UPGRADER_UI_HSV_UPPER,
  type UpgraderGeometry,
} from "./upgrader-constants";

const CLICK_OPTIONS_175X = getClickOptionsFromPreset("1.75x");

export type UpgraderConfig = {
  attackIcon: string;
  headerImage: string;
  skillName: string;
  // In-game panel's total row count (visible + locked placeholders). Source
  // of truth is the skill's *_UPGRADE_DEFS.length - sets maxTopRow + scroll
  // pitch. Per-skill because tesseract has 63 rows, grimoire 55.
  totalRows: number;
  geometry: UpgraderGeometry;
  upgradeNameOf: (index: number) => string;
  logPrefix: string;
};

export async function runUpgraderLoop(
  steps: readonly UpgraderStep[],
  config: UpgraderConfig,
  token: CancellationToken
): Promise<void> {
  if (steps.length === 0) {
    logger.log(`${config.logPrefix} - no steps, exiting`);
    return;
  }

  logger.log(`${config.logPrefix} - starting with ${steps.length} step(s)`);

  const opened = await navigation.findAttackSkill(
    config.attackIcon,
    token,
    config.skillName
  );
  if (!opened) {
    logger.log(
      `${config.logPrefix} - ${config.skillName} skill not found - aborting`
    );
    return;
  }

  const headerVisible = await backendCommand.findHSV(
    config.headerImage,
    UPGRADER_UI_HSV_LOWER,
    UPGRADER_UI_HSV_UPPER,
    undefined,
    token
  );
  if (headerVisible.length === 0) {
    logger.log(`${config.logPrefix} - panel header not found - aborting`);
    return;
  }

  // Panel is open and the list defaults to topRow=0.
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

    await backendCommand.click(
      click,
      { ...CLICK_OPTIONS_175X, times: step.levels },
      token
    );
    await delay(UPGRADER_CLICK_SETTLE_MS, token);
  }

  logger.log(`${config.logPrefix} - finished`);
}
