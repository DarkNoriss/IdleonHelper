import { defineScript } from "../../define-script";
import { runBossFarmerLoop } from "./boss-farmer";

export default defineScript<[number]>({
  id: "general.gemBossFarmer.run",
  name: "Gem Boss Farmer",
  run: ({ token, args: [totalIterations] }) =>
    runBossFarmerLoop({
      token,
      total: totalIterations,
      logPrefix: "Gem Boss Farmer",
    }),
});
