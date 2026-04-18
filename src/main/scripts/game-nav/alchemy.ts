import type { CancellationToken } from "../../utils/cancellation-token";
import {
  ALCHEMY_BREWING_BG,
  ALCHEMY_BREWING_OFF,
  ALCHEMY_EXIT,
  ALCHEMY_TAB,
} from "../world2/alchemy-upgrade/alchemy-upgrade-constants";
import { codex } from "./codex";
import { navigateTo } from "./helpers";

const toAlchemy = async (token: CancellationToken): Promise<boolean> =>
  navigateTo(ALCHEMY_EXIT, ALCHEMY_TAB, codex.toQuikRef, token, "Alchemy");

const toBrewing = async (token: CancellationToken): Promise<boolean> =>
  navigateTo(
    ALCHEMY_BREWING_BG,
    ALCHEMY_BREWING_OFF,
    toAlchemy,
    token,
    "Brewing"
  );

export const alchemy = { toAlchemy, toBrewing } as const;
