import {
  beanTradingGetTickets,
  beanTradingTradeCrops,
  farmingLockUnlock,
  farmingStart,
} from "./farming";
import { summoningStartAutobattler, summoningStartEndless } from "./summoning";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  beanTradingGetTickets,
  beanTradingTradeCrops,
  summoningStartEndless,
  summoningStartAutobattler,
];
