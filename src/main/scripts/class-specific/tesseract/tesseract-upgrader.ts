import type { UpgraderStep } from "@/types/upgrader";
import { TESSERACT_UPGRADE_DEFS } from "../../../../parsers/tesseract-data";
import { runUpgraderLoop } from "../../_shared/upgrader/index";
import { defineScript } from "../../define-script";

export default defineScript<[UpgraderStep[]]>({
  id: "classSpecific.tesseract.runUpgrader",
  name: "Tesseract - Run Upgrader",
  run: ({ token, args: [steps] }) =>
    runUpgraderLoop(
      steps,
      {
        attackIcon: "ui/attacks/attack_tesseract",
        headerImage: "class-specific/tesseract_header",
        skillName: "Tesseract",
        totalRows: TESSERACT_UPGRADE_DEFS.length,
        geometry: { scrollbarX: 928 },
        upgradeNameOf: (i) => TESSERACT_UPGRADE_DEFS[i]?.name ?? "?",
        logPrefix: "tesseract-upgrader",
      },
      token
    ),
});
