import { classSpecificScripts } from "./class-specific/index.ts";
import type { ScriptDescriptor } from "./define-script.ts";
import { generalScripts } from "./general/index.ts";
import { world2Scripts } from "./world2/index.ts";
import { world3Scripts } from "./world3/index.ts";
import { world6Scripts } from "./world6/index.ts";

export const allScripts: ScriptDescriptor[] = [
  ...generalScripts,
  ...classSpecificScripts,
  ...world2Scripts,
  ...world3Scripts,
  ...world6Scripts,
];

// Re-export navigation for scripts that use it
export { navigation } from "./game-nav/index.ts";
// Re-export non-script functions that handlers still needs
export {
  weeklyBattleFetch,
  weeklyBattleGet,
  weeklyBattleOnChange,
} from "./world2/index.ts";
export { solver } from "./world3/index.ts";
