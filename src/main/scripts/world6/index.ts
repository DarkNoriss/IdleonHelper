import { lockUnlock } from "./farming-lock-unlock";
import { start } from "./farming-start";
import { summoning } from "./summoning";

export const world6 = {
  farming: {
    start,
    lockUnlock,
  },
  summoning,
} as const;
