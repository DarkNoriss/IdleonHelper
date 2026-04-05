import collectCogs from "./collect-cogs.ts";
import collectTraps from "./collect-traps.ts";
import constructionApply from "./construction-apply.ts";
import placeTraps from "./place-traps.ts";
import trashCogs from "./trash-cogs.ts";

// Solver is NOT a defineScript - stays as regular handler
export { solver } from "./construction-solver.ts";

export const world3Scripts = [
  constructionApply,
  collectCogs,
  trashCogs,
  collectTraps,
  placeTraps,
];
