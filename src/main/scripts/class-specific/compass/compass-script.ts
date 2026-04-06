import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import type { CompassUpgrade, MinorNodeWithParent } from "@/types/compass";
import {
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../../backend/backend-config";
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
  | { type: "standard"; id: string; change: number }
  | { type: "minor"; minor: MinorNodeWithParent; change: number };

const ALL_NODE_IDS = new Set([
  ...COMPASS_NODE_DEFS.map((n) => n.id),
  ...COMPASS_MINOR_NODE_DEFS.map((n) => n.id),
]);

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

const resolveUpgrade = (upgrade: CompassUpgrade): ResolvedUpgrade | null => {
  const matchedId = findMatch(upgrade.name);
  if (!matchedId) {
    return null;
  }

  const minor = COMPASS_MINOR_NODE_DEFS.find((m) => m.id === matchedId);
  if (minor) {
    return { type: "minor", minor, change: upgrade.change };
  }

  const standard = COMPASS_NODE_DEFS.find((n) => n.id === matchedId);
  if (standard) {
    return { type: "standard", id: standard.id, change: upgrade.change };
  }

  return null;
};

export default defineScript<[CompassUpgrade[]]>({
  id: "classSpecific.compass.run",
  name: "Compass",
  run: async ({ token, backend, logger, args: [upgrades] }) => {
    logger.log(`Compass: processing ${upgrades.length} upgrades`);

    // Setup
    await openCompass(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, COMPASS_CENTER);

    await dismissPanel(backend, token);

    // Find starting position
    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Starting from: ${startNode.id}`);
    await backend.drag(
      startNode.point,
      COMPASS_CENTER,
      { instant: true },
      token
    );

    const graph = loadGraph();
    let currentNode = startNode.id;
    let locked = new Set<string>();

    for (let i = 0; i < upgrades.length; i++) {
      token.throwIfCancelled();
      const upgrade = upgrades[i]!;
      logger.log(
        `[${i + 1}/${upgrades.length}] ${upgrade.name} +${upgrade.change}`
      );

      const resolved = resolveUpgrade(upgrade);
      if (!resolved) {
        logger.log(`  SKIP: no matching node for "${upgrade.name}"`);
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
          backend,
          token,
          logger,
          locked
        );
        locked = result.locked;

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
        const hasCost = await backend.isVisible(
          "compass/compass_cost",
          undefined,
          token
        );

        if (hasCost.length > 0) {
          break;
        }

        await backend.click(clickPoint, undefined, token);
        panelIntervalOpened++;
      }

      // Click upgrade button
      const hasUpgrade = await backend.find(
        "compass/compass_upgrade",
        { threshold: 0.995 },
        token
      );

      if (hasUpgrade.matches.length > 0) {
        const fastClick = getClickOptionsFromPreset(ClickPreset.Fast);
        await backend.click(
          hasUpgrade.matches[0]!,
          { times: resolved.change, ...fastClick },
          token
        );
      } else {
        const hasUpgradeOff = await backend.isVisible(
          "compass/compass_upgrade_off",
          undefined,
          token
        );
        if (hasUpgradeOff.length > 0) {
          logger.log("  Upgrade not available");
        } else {
          logger.log("  ERROR: upgrade panel not detected");
        }
      }

      await dismissPanel(backend, token);
    }

    logger.log(`Compass: done (${upgrades.length} upgrades processed)`);
  },
});
