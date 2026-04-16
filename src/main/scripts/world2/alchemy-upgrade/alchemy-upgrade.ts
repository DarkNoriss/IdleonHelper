import type { Selections } from "@/types/alchemy";
import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  ALCHEMY_BREWING_TAB,
  ALCHEMY_TAB,
  type CauldronKey,
} from "./alchemy-upgrade-constants";

const openAlchemyBrewing = async (
  token: CancellationToken
): Promise<boolean> => {
  logger.log("alchemy-upgrade - opening alchemy tab");
  const alchemyFound = await backendCommand.find(ALCHEMY_TAB, undefined, token);
  if (alchemyFound.length === 0) {
    logger.log("alchemy-upgrade - alchemy tab not found");
    return false;
  }
  await backendCommand.click(alchemyFound[0]!, undefined, token);

  logger.log("alchemy-upgrade - opening brewing sub-tab");
  const brewingFound = await backendCommand.find(
    ALCHEMY_BREWING_TAB,
    undefined,
    token
  );
  if (brewingFound.length === 0) {
    logger.log("alchemy-upgrade - brewing tab not found");
    return false;
  }
  await backendCommand.click(brewingFound[0]!, undefined, token);
  return true;
};

export default defineScript<[Selections]>({
  id: "world2.alchemyUpgrade.run",
  name: "Alchemy - Upgrade Bubbles",
  run: async ({ token, args: [selections] }) => {
    const selectedKeys = (Object.keys(selections) as CauldronKey[]).filter(
      (k) => selections[k] !== null && selections[k] !== ""
    );

    if (selectedKeys.length === 0) {
      logger.log("alchemy-upgrade - no bubbles selected, exiting");
      return;
    }

    logger.log(
      `alchemy-upgrade - starting with ${selectedKeys.length} selection(s): ${selectedKeys.join(", ")}`
    );

    const opened = await openAlchemyBrewing(token);
    if (!opened) {
      return;
    }

    // Search loop added in Task 10.
    logger.log(
      "alchemy-upgrade - brewing open; search loop not yet implemented"
    );
  },
});
