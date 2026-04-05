import { defineScript } from "../../define-script";
import {
  calibrateCompassCenter,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

export default defineScript({
  id: "classSpecific.compass.calibrate",
  name: "Compass Calibrate Center",
  run: async ({ token, backend, logger }) => {
    await openCompass(backend, token, logger);
    const center = await calibrateCompassCenter(backend, token, logger);
    await scrollInAtCenter(backend, token, logger, center);
    logger.log("Calibrate: done -> copy the logged center into COMPASS_CENTER");
  },
});
