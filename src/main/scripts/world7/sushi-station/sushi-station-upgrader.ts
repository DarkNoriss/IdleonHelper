import type { UpgraderStep } from "@/types/upgrader";
import {
  SLOT_TO_UPG,
  SUSHI_UPG,
} from "../../../../parsers/sushi-station-formulas";
import {
  inactiveTabOpener,
  runUpgraderLoop,
} from "../../_shared/upgrader/index";
import { defineScript } from "../../define-script";
import { SUSHI_UPGRADE_TAB } from "./sushi-station-constants";

const LOG_PREFIX = "sushi-upgrader";

export default defineScript<[UpgraderStep[], boolean]>({
  id: "world7.sushiStation.sushiUpgrader",
  name: "Sushi Station - Upgrade",
  run: ({ token, args: [steps, dryRun] }) =>
    runUpgraderLoop(
      steps,
      {
        ensureOpen: inactiveTabOpener(SUSHI_UPGRADE_TAB, LOG_PREFIX),
        totalRows: SLOT_TO_UPG.length,
        geometry: { scrollbarX: 725, scrollbarYTop: 70, scrollbarYBottom: 425 },
        upgradeNameOf: (i) => SUSHI_UPG[SLOT_TO_UPG[i] ?? -1]?.[0] ?? "?",
        logPrefix: LOG_PREFIX,
      },
      dryRun,
      token
    ),
});
