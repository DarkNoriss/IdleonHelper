import collectCogs from "./collect-cogs";
import constructionApply from "./construction-apply";
import trashCogs from "./trash-cogs";

// Solver is NOT a defineScript - stays as regular handler
export { solver } from "./construction-solver";

export const world3Scripts = [constructionApply, collectCogs, trashCogs];
