import {
  beanTradingGetTickets,
  beanTradingTradeCrops,
  beanTradingTradeCropsDebug,
  farmingLockUnlock,
  farmingStart,
} from "./farming";
import { summoningStartAutobattler, summoningStartEndless } from "./summoning";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  beanTradingGetTickets,
  beanTradingTradeCrops,
  beanTradingTradeCropsDebug,
  summoningStartEndless,
  summoningStartAutobattler,
];
