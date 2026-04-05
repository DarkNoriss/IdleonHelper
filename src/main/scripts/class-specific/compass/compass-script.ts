import type { CompassUpgrade } from "../../../../types/compass";
import { defineScript } from "../../define-script";
import {
  findAnyNode,
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

    await openCompass(backend, token, logger);
    const center = await findCompassCenter(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, center);

    const startNode = await findAnyNode(backend, token, logger);
    logger.log(`Starting from: ${startNode.id}`);
    await backend.drag(startNode.point, center, { instant: true }, token);

    logger.log("Compass script finished");
  },
});
