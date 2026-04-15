import { backendCommand } from "../../backend/index";
import type { CancellationToken } from "../../utils/cancellation-token";
import { logger } from "../../utils/index";

const ATTACKS_ICON = "ui/attacks/attacks";
const ARROW_DOWN = "ui/attacks/attack_arrow_down";
const MAX_ATTEMPTS = 12;

// Opens the attack bar if collapsed, scrolls down through pages until the
// target skill image is visible, then clicks it. Returns true if clicked.
export const findAttackSkill = async (
  skillImage: string,
  token: CancellationToken,
  skillName = "skill"
): Promise<boolean> => {
  logger.log(`Looking for ${skillName} on attack bar...`);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    token.throwIfCancelled();
    const visible = await backendCommand.isVisibleParallel(
      {
        target: skillImage,
        arrowDown: ARROW_DOWN,
        attacks: ATTACKS_ICON,
      },
      undefined,
      token
    );

    if (visible.target!.length > 0) {
      await backendCommand.click(visible.target![0]!, undefined, token);
      return true;
    }
    if (visible.arrowDown!.length > 0) {
      await backendCommand.click(visible.arrowDown![0]!, undefined, token);
      continue;
    }
    if (visible.attacks!.length > 0) {
      logger.log("Attacks bar collapsed, opening...");
      await backendCommand.click(visible.attacks![0]!, undefined, token);
      continue;
    }
    break;
  }

  return false;
};
