import {
  beanTradingGetTickets,
  farmingLockUnlock,
  farmingStart,
} from "./farming";
import { summoningStartAutobattler, summoningStartEndless } from "./summoning";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  beanTradingGetTickets,
  summoningStartEndless,
  summoningStartAutobattler,
];
