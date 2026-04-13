import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";

export default defineScript<[string]>({
  id: "general.debug.findAttackSkill",
  name: "Debug: Find Attack Skill",
  run: async ({ token, args: [skillImage] }) => {
    if (!skillImage) {
      throw new Error("skillImage argument is required");
    }

    const start = Date.now();
    const clicked = await navigation.findAttackSkill(
      skillImage,
      token,
      skillImage
    );
    const elapsed = Date.now() - start;

    if (clicked) {
      logger.log(`findAttackSkill: clicked ${skillImage} in ${elapsed}ms`);
    } else {
      logger.log(`findAttackSkill: ${skillImage} not found after ${elapsed}ms`);
    }
  },
});
