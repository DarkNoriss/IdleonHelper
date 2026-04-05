import farmingLockUnlock from "./farming-lock-unlock.ts";
import farmingStart from "./farming-start.ts";
import {
  summoningStartAutobattler,
  summoningStartEndless,
} from "./summoning.ts";

export const world6Scripts = [
  farmingStart,
  farmingLockUnlock,
  summoningStartEndless,
  summoningStartAutobattler,
];
