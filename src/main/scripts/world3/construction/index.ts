import collectCogs from "./collect-cogs";
import constructionApply from "./construction-apply";
import trashCogs from "./trash-cogs";

export { solver } from "./construction-solver";

export const constructionScripts = [constructionApply, collectCogs, trashCogs];
