import type { ScriptDescriptor } from "./define-script";
import { generalScripts } from "./general";
import { world2Scripts } from "./world2";
import { world3Scripts } from "./world3";
import { world6Scripts } from "./world6";

export const allScripts: ScriptDescriptor[] = [
  ...generalScripts,
  ...world2Scripts,
  ...world3Scripts,
  ...world6Scripts,
];

// Re-export navigation for scripts that use it
export { navigation } from "./game-nav";
// Re-export non-script functions that handlers still needs
export {
  weeklyBattleFetch,
  weeklyBattleGet,
  weeklyBattleOnChange,
} from "./world2";
export { solver } from "./world3";
