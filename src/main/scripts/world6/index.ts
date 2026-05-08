import w6BossFarmer from "./boss/w6-boss-farmer";
import {
  beanTradingGetTickets,
  beanTradingTradeCrops,
  farmingCollectCrops,
  farmingCollectCropsDebug,
} from "./farming";
import {
  debugBoardImage,
  debugBoardRange,
  summoningStartAutobattler,
  summoningStartEndless,
} from "./summoning";

export const world6Scripts = [
  w6BossFarmer,
  beanTradingGetTickets,
  beanTradingTradeCrops,
  farmingCollectCrops,
  farmingCollectCropsDebug,
  summoningStartEndless,
  summoningStartAutobattler,
  debugBoardRange,
  debugBoardImage,
];
