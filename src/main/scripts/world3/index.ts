import { constructionScripts } from "./construction/index";
import { trappingScripts } from "./trapping/index";

export { cancelSolver, isSolverRunning, solve } from "./construction/index";

export const world3Scripts = [...constructionScripts, ...trappingScripts];
