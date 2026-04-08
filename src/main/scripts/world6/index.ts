import {
  beanTradingDebug,
  beanTradingGetTickets,
  farmingLockUnlock,
  farmingStart,
} from "./farming";
import { summoningStartAutobattler, summoningStartEndless } from "./summoning";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  beanTradingDebug,
  beanTradingGetTickets,
  summoningStartEndless,
  summoningStartAutobattler,
];
