import type { UpgraderStep } from "@/types/upgrader";
import { GRIMOIRE_UPGRADE_DEFS } from "../../../../parsers/grimoire-data";
import { runUpgraderLoop } from "../../_shared/upgrader/index";
import { defineScript } from "../../define-script";

export default defineScript<[UpgraderStep[]]>({
  id: "classSpecific.grimoire.runUpgrader",
  name: "Grimoire - Run Upgrader",
  run: ({ token, args: [steps] }) =>
    runUpgraderLoop(
      steps,
      {
        attackIcon: "ui/attacks/attack_grimoire",
        headerImage: "class-specific/grimoire_header",
        skillName: "Grimoire",
        totalRows: GRIMOIRE_UPGRADE_DEFS.length,
        geometry: { scrollbarX: 815 },
        upgradeNameOf: (i) => GRIMOIRE_UPGRADE_DEFS[i]?.name ?? "?",
        logPrefix: "grimoire-upgrader",
      },
      token
    ),
});
