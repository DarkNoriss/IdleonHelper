import { constructionScripts } from "./construction/index";
import { trappingScripts } from "./trapping/index";

export { solver } from "./construction/index";

export const world3Scripts = [...constructionScripts, ...trappingScripts];
