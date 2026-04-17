import type { HsvColor } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

export default defineScript<[HsvColor, HsvColor]>({
  id: "general.debug.captureHsvScreen",
  name: "Debug: Capture HSV Screen",
  run: async ({ token, args: [hsvLower, hsvUpper] }) => {
    logger.log(
      `capture-hsv-screen - hsv lower=${hsvLower.h},${hsvLower.s},${hsvLower.v} upper=${hsvUpper.h},${hsvUpper.s},${hsvUpper.v}`
    );
    const response = await backendCommand.captureHsvScreen(
      hsvLower,
      hsvUpper,
      undefined,
      token
    );
    logger.log(`capture-hsv-screen - saved to ${response.savedPath}`);
  },
});
