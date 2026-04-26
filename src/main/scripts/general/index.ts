import { bossFarmer, gemBossFarmer } from "./boss-farmer";
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
  gemBossFarmer,
  cardApplyPreset,
  cardSelectPreset,
  ...cloudsaveScripts,
  ...debugScripts,
];
