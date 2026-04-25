import bossFarmer from "./boss-farmer";
import candy from "./candy";
import cardApplyPreset from "./cards/card-apply-preset";
import cardSelectPreset from "./cards/card-select-preset";
import { cloudsaveScripts } from "./cloudsave";
import { debugScripts } from "./debug";
import storeItems from "./storage";

export const generalScripts = [
  storeItems,
  candy,
  bossFarmer,
  cardApplyPreset,
  cardSelectPreset,
  ...cloudsaveScripts,
  ...debugScripts,
];
