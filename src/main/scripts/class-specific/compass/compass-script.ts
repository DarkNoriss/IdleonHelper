import type { CompassUpgrade } from "../../../../types/compass";
import { defineScript } from "../../define-script";
import {
  findCompassCenter,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

export default defineScript<[CompassUpgrade[]]>({
  id: "classSpecific.compass.run",
  name: "Compass",
  run: async ({ token, backend, logger, args: [upgrades] }) => {
    logger.log(`Compass: received ${upgrades.length} upgrades`);
    for (const upgrade of upgrades) {
      logger.log(`  ${upgrade.name}: +${upgrade.change}`);
    }

    // Step 1: Find and open Compass attack
    await openCompass(backend, token, logger);

    // Step 2: Calculate compass center from corner markers
    const center = await findCompassCenter(backend, token, logger);

    // Step 3: Scroll in to zoom at compass center
    await scrollInAtCenter(backend, token, logger, center);

    // Step 4: Drag pathfinder to center
    logger.log("Looking for pathfinder...");
    const pathfinder = await backend.find(
      "compass/compass_pathfinder",
      undefined,
      token
    );
    if (pathfinder.matches.length === 0) {
      throw new Error("Pathfinder not found");
    }
    logger.log("Dragging pathfinder to center...");
    await backend.drag(
      pathfinder.matches[0]!,
      center,
      { instant: true },
      token
    );

    // Step 5: Drag fighter path to center
    logger.log("Looking for fighter path...");
    const fighterPath = await backend.find(
      "compass/fighter-path/compass_fighter_path",
      undefined,
      token
    );
    if (fighterPath.matches.length === 0) {
      throw new Error("Fighter path not found");
    }
    logger.log("Dragging fighter path to center...");
    await backend.drag(
      fighterPath.matches[0]!,
      center,
      { instant: true },
      token
    );

    logger.log("Compass script finished");
  },
});
