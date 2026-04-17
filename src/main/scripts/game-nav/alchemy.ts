import type { CancellationToken } from "../../utils/cancellation-token";
import {
  ALCHEMY_ARROW_UP,
  ALCHEMY_BREWING_TAB,
  ALCHEMY_HSV_LOWER,
  ALCHEMY_HSV_UPPER,
  ALCHEMY_TAB,
  ALCHEMY_UI_HSV_LOWER,
  ALCHEMY_UI_HSV_UPPER,
} from "../world2/alchemy-upgrade/alchemy-upgrade-constants";
import { codex } from "./codex";
import { navigateToHSV } from "./helpers";

// Match each template at the SAME HSV threshold it was captured with. Mixing a
// v=128 (sparse) template against a v=1 (dense) runtime mask tanks correlation
// because the template's dark regions line up with the runtime's bright pixels.
const tabHsv = {
  hsvLower: ALCHEMY_HSV_LOWER,
  hsvUpper: ALCHEMY_HSV_UPPER,
};

const uiHsv = {
  hsvLower: ALCHEMY_UI_HSV_LOWER,
  hsvUpper: ALCHEMY_UI_HSV_UPPER,
};

const toAlchemy = async (token: CancellationToken): Promise<boolean> =>
  navigateToHSV(
    { image: ALCHEMY_BREWING_TAB, ...uiHsv },
    { image: ALCHEMY_TAB, ...tabHsv },
    codex.toQuikRef,
    token,
    "Alchemy"
  );

const toBrewing = async (token: CancellationToken): Promise<boolean> =>
  navigateToHSV(
    { image: ALCHEMY_ARROW_UP, ...uiHsv },
    { image: ALCHEMY_BREWING_TAB, ...uiHsv },
    toAlchemy,
    token,
    "Brewing"
  );

export const alchemy = { toAlchemy, toBrewing } as const;
