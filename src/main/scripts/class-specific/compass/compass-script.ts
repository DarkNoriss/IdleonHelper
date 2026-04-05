import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import type { CompassUpgrade, MinorNodeWithParent } from "@/types/compass";
import { delay } from "../../../utils";
import { defineScript } from "../../define-script";
import {
  COMPASS_CENTER,
  findAnyNode,
  loadGraph,
  navigateToNode,
  openCompass,
  scrollInAtCenter,
  WHEEL_DELTA,
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

    // GUI reset: if upgrade panel is open, scroll to dismiss it
    await delay(200, token);
    if (
      (await backend.isVisible("compass/compass", undefined, token)).length ===
      0
    ) {
      logger.log("GUI overlay detected, resetting...");
      await backend.scroll(COMPASS_CENTER, -WHEEL_DELTA, undefined, token);
      await delay(200, token);
      await backend.scroll(COMPASS_CENTER, WHEEL_DELTA, undefined, token);
      await delay(200, token);
    }

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

      if (resolved.type === "minor") {
        logger.log(`  Minor node -> parent "${navTarget}"`);
      }

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

      // Click the node to open upgrade panel
      logger.log(`  Clicking at (${clickPoint.x}, ${clickPoint.y})`);
      await backend.click(clickPoint, undefined, token);

      // Check upgrade availability
      const hasUpgrade = await backend.isVisible(
        "compass/compass_upgrade",
        { threshold: 0.995 },
        token
      );

      if (hasUpgrade.length === 0) {
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

      // Click again to dismiss
      await backend.click(clickPoint, undefined, token);
    }

    logger.log(`Compass: done (${upgrades.length} upgrades processed)`);
  },
});
