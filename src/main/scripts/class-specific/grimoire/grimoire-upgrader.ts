import type { UpgraderStep } from "@/types/upgrader";
import { GRIMOIRE_UPGRADE_DEFS } from "../../../../parsers/grimoire-data";
import {
  attackSkillOpener,
  runUpgraderLoop,
} from "../../_shared/upgrader/index";
import { defineScript } from "../../define-script";

const LOG_PREFIX = "grimoire-upgrader";

export default defineScript<[UpgraderStep[], boolean]>({
  id: "classSpecific.grimoire.runUpgrader",
  name: "Grimoire - Run Upgrader",
  run: ({ token, args: [steps, dryRun] }) =>
    runUpgraderLoop(
      steps,
      {
        ensureOpen: attackSkillOpener(
          "ui/attacks/attack_grimoire",
          "class-specific/grimoire_header",
          "Grimoire",
          LOG_PREFIX
        ),
        totalRows: GRIMOIRE_UPGRADE_DEFS.length,
        geometry: { scrollbarX: 815 },
        upgradeNameOf: (i) => GRIMOIRE_UPGRADE_DEFS[i]?.name ?? "?",
        logPrefix: LOG_PREFIX,
      },
      dryRun,
      token
    ),
});
