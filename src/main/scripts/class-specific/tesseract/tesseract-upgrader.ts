import type { UpgraderStep } from "@/types/upgrader";
import { TESSERACT_UPGRADE_DEFS } from "../../../../parsers/tesseract-data";
import {
  attackSkillOpener,
  runUpgraderLoop,
} from "../../_shared/upgrader/index";
import { defineScript } from "../../define-script";

const LOG_PREFIX = "tesseract-upgrader";

export default defineScript<[UpgraderStep[], boolean]>({
  id: "classSpecific.tesseract.runUpgrader",
  name: "Tesseract - Run Upgrader",
  run: ({ token, args: [steps, dryRun] }) =>
    runUpgraderLoop(
      steps,
      {
        ensureOpen: attackSkillOpener(
          "ui/attacks/attack_tesseract",
          "class-specific/tesseract_header",
          "Tesseract",
          LOG_PREFIX
        ),
        totalRows: TESSERACT_UPGRADE_DEFS.length,
        geometry: { scrollbarX: 928 },
        upgradeNameOf: (i) => TESSERACT_UPGRADE_DEFS[i]?.name ?? "?",
        logPrefix: LOG_PREFIX,
      },
      dryRun,
      token
    ),
});
