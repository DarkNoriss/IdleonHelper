import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { cloudsave } from "./cloudsave";

export default defineScript({
  id: "general.cloudsave.run",
  name: "Cloudsave",
  run: async ({ token }) => {
    const ok = await cloudsave(token);
    if (!ok) {
      throw new Error("cloudsave flow failed");
    }
    logger.log("cloudsave - completed successfully");
  },
});
