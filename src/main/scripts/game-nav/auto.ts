import type { HsvColor } from "../../backend/backend-types";
import { backendCommand } from "../../backend/index";
import type { CancellationToken } from "../../utils/cancellation-token";
import { logger } from "../../utils/index";

const AUTO_HSV: { hsvLower: HsvColor; hsvUpper: HsvColor } = {
  hsvLower: { h: 0, s: 0, v: 128 },
  hsvUpper: { h: 192, s: 255, v: 255 },
};

const AUTO_THRESHOLD = 0.85;

export const setAuto = async (
  target: "on" | "off",
  token: CancellationToken
): Promise<void> => {
  const visible = await backendCommand.isVisibleHSVParallel(
    {
      on: "ui/auto/auto_on",
      off: "ui/auto/auto_off",
    },
    AUTO_HSV.hsvLower,
    AUTO_HSV.hsvUpper,
    { threshold: AUTO_THRESHOLD },
    token
  );

  const onVisible = (visible.on ?? []).length > 0;
  const offVisible = (visible.off ?? []).length > 0;

  if (!(onVisible || offVisible)) {
    throw new Error(
      "auto button not visible - neither auto_on nor auto_off found"
    );
  }

  const currentlyOn = onVisible;
  const desiredOn = target === "on";

  if (currentlyOn === desiredOn) {
    logger.log(`Auto already ${target}`);
    return;
  }

  const clickPoint = onVisible ? visible.on![0]! : visible.off![0]!;
  await backendCommand.click(clickPoint, undefined, token);
  logger.log(`Auto toggled to ${target}`);
};
