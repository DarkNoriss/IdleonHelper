import { classSpecificScripts } from "./class-specific/index";
import type { ScriptDescriptor } from "./define-script";
import { generalScripts } from "./general/index";
import { world2Scripts } from "./world2/index";
import { world3Scripts } from "./world3/index";
import { world6Scripts } from "./world6/index";
import { world7Scripts } from "./world7/index";

export const allScripts: ScriptDescriptor[] = [
  ...generalScripts,
  ...classSpecificScripts,
  ...world2Scripts,
  ...world3Scripts,
  ...world6Scripts,
  ...world7Scripts,
];

// Re-export navigation for scripts that use it
export { navigation } from "./game-nav/index";
// Re-export non-script functions that handlers still needs
export {
  weeklyBattleFetch,
  weeklyBattleGet,
  weeklyBattleOnChange,
} from "./world2/index";
export { cancelSolver, solve } from "./world3/index";
