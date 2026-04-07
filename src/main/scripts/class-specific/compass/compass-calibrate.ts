import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  calibrateCompassCenter,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

export default defineScript({
  id: "classSpecific.compass.calibrate",
  name: "Compass Calibrate Center",
  run: async ({ token }) => {
    await openCompass(token);
    const center = await calibrateCompassCenter(token);
    await scrollInAtCenter(token, center);
    logger.log("Calibrate: done -> copy the logged center into COMPASS_CENTER");
  },
});
