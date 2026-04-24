import collectCogs from "./collect-cogs";
import constructionApply from "./construction-apply";
import trashCogs from "./trash-cogs";

export {
  cancelSolver,
  solve,
} from "./construction-solver-orchestrator";

export const constructionScripts = [constructionApply, collectCogs, trashCogs];
