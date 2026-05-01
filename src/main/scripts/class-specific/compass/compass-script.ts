import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import type { MinorNodeWithParent } from "@/types/compass";
import type { UpgraderStep } from "@/types/upgrader";
import { COMPASS_UPGRADE_DEFS } from "../../../../parsers/compass-data";
import { getClickOptionsFromPreset } from "../../../backend/backend-config";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  COMPASS_CENTER,
  dismissPanel,
  findAnyNode,
  loadGraph,
  navigateToNode,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

type ResolvedUpgrade =
  | { type: "standard"; id: string; levels: number; label: string }
  | {
      type: "minor";
      minor: MinorNodeWithParent;
      levels: number;
      label: string;
    };

const ALL_NODE_IDS = new Set([
  ...COMPASS_NODE_DEFS.map((n) => n.id),
  ...COMPASS_MINOR_NODE_DEFS.map((n) => n.id),
]);

// Mirrors the dash-casing in compass-parser.ts so def names land on the same
// id table the standalone parser produces (e.g. "Faster Attack Speed" ->
// "faster-attack-speed", which then matches "compass-faster-attack-speed").
const defNameToNodeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const findMatch = (name: string): string | undefined => {
  if (ALL_NODE_IDS.has(name)) {
    return name;
  }
  for (const id of ALL_NODE_IDS) {
    if (id.endsWith(`-${name}`)) {
      return id;
    }
  }
  return undefined;
};

const resolveStep = (step: UpgraderStep): ResolvedUpgrade | null => {
  const def = COMPASS_UPGRADE_DEFS[step.index];
  if (!def) {
    return null;
  }
  const matchedId = findMatch(defNameToNodeName(def.name));
  if (!matchedId) {
    return null;
  }

  const minor = COMPASS_MINOR_NODE_DEFS.find((m) => m.id === matchedId);
  if (minor) {
    return { type: "minor", minor, levels: step.levels, label: def.name };
  }

  const standard = COMPASS_NODE_DEFS.find((n) => n.id === matchedId);
  if (standard) {
    return {
      type: "standard",
      id: standard.id,
      levels: step.levels,
      label: def.name,
    };
  }

  return null;
};

export default defineScript<[UpgraderStep[]]>({
  id: "classSpecific.compass.run",
  name: "Compass",
  run: async ({ token, args: [steps] }) => {
    logger.log(`Compass: processing ${steps.length} upgrades`);

    // Setup
    await openCompass(token);
    await scrollInAtCenter(token, COMPASS_CENTER);

    await dismissPanel(token);

    // Find starting position
    const startNode = await findAnyNode(token);
    logger.log(`Starting from: ${startNode.id}`);
    await backendCommand.drag(
      startNode.point,
      COMPASS_CENTER,
      { instant: true },
      token
    );

    const graph = loadGraph();
    let currentNode = startNode.id;

    for (let i = 0; i < steps.length; i++) {
      token.throwIfCancelled();
      const step = steps[i]!;
      const def = COMPASS_UPGRADE_DEFS[step.index];
      const label = def?.name ?? `index-${step.index}`;
      logger.log(`[${i + 1}/${steps.length}] ${label} +${step.levels}`);

      const resolved = resolveStep(step);
      if (!resolved) {
        logger.log(`  SKIP: no matching node for "${label}"`);
        continue;
      }

      // Determine navigation target and click point
      const navTarget =
        resolved.type === "minor" ? resolved.minor.parent : resolved.id;
      const clickPoint =
        resolved.type === "minor" ? resolved.minor.offset : COMPASS_CENTER;

      // Navigate
      if (currentNode !== navTarget) {
        const result = await navigateToNode(
          currentNode,
          navTarget,
          COMPASS_CENTER,
          graph,
          token
        );

        if (!result.arrived) {
          logger.log(
            `  SKIP: could not reach "${navTarget}" (locked or unreachable)`
          );
          currentNode = result.currentNode;
          continue;
        }
      }
      currentNode = navTarget;

      let panelIntervalOpened = 0;
      while (panelIntervalOpened < 10) {
        const hasCost = await backendCommand.isVisible(
          "compass/compass_cost",
          undefined,
          token
        );

        if (hasCost.length > 0) {
          break;
        }

        await backendCommand.click(clickPoint, undefined, token);
        panelIntervalOpened++;
      }

      // Click upgrade button
      const panelState = await backendCommand.findParallel(
        {
          upgrade: "compass/compass_upgrade",
          upgradeOff: "compass/compass_upgrade_off",
        },
        { threshold: 0.995 },
        token
      );

      if (panelState.upgrade!.length > 0) {
        const fastClick = getClickOptionsFromPreset("2x");
        await backendCommand.click(
          panelState.upgrade![0]!,
          { times: resolved.levels, ...fastClick },
          token
        );
      } else if (panelState.upgradeOff!.length > 0) {
        logger.log("  Upgrade not available");
      } else {
        logger.log("  ERROR: upgrade panel not detected");
      }

      await dismissPanel(token);
    }

    logger.log(`Compass: done (${steps.length} upgrades processed)`);
  },
});
