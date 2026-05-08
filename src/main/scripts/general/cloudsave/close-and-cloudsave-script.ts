import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { closeMenu } from "../../keys";
import { cloudsave } from "./cloudsave";

export default defineScript({
  id: "general.closeAndCloudsave",
  name: "Close & Cloudsave",
  run: async ({ token }) => {
    logger.log(
      "close-and-cloudsave - pressing ESCAPE to close any open sub-screen"
    );
    await closeMenu(token);
    const ok = await cloudsave(token);
    if (!ok) {
      throw new Error("cloudsave flow failed");
    }
    logger.log("close-and-cloudsave - completed successfully");
  },
});
