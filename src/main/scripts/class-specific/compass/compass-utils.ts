import { COMPASS_NODE_GROUPS } from "@/shared/compass-config";
import type { Point } from "../../../backend/backend-types";
import type { ScriptContext } from "../../define-script";

const ARROW_DOWN_MAX_ATTEMPTS = 3;
const SCROLL_IN_TIMES = 8;
const WHEEL_DELTA = 120;

export const findCompassCenter = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<Point> => {
  logger.log("Calculating compass center...");
  const topLeft = await backend.find(
    "compass/compass_top_left",
    undefined,
    token
  );
  if (topLeft.matches.length === 0) {
    throw new Error("Compass top-left corner not found");
  }
  const bottomRight = await backend.find(
    "compass/compass_bottom_right",
    undefined,
    token
  );
  if (bottomRight.matches.length === 0) {
    throw new Error("Compass bottom-right corner not found");
  }
  const tl = topLeft.matches[0]!;
  const br = bottomRight.matches[0]!;
  const center = {
    x: Math.round((tl.x + br.x) / 2),
    y: Math.round((tl.y + br.y) / 2),
  };
  logger.log(`Compass center: (${center.x}, ${center.y})`);
  return center;
};

export const openCompass = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<void> => {
  logger.log("Looking for Compass skill...");
  let compassFound = false;

  const quickFindCompass = async (): Promise<boolean> => {
    if (
      await backend.isVisible("ui/attacks/attack_compass", undefined, token)
    ) {
      return backend.findAndClick(
        "ui/attacks/attack_compass",
        undefined,
        token
      );
    }
    return false;
  };

  const scrollAndFindCompass = async (): Promise<boolean> => {
    for (let i = 0; i < ARROW_DOWN_MAX_ATTEMPTS; i++) {
      token.throwIfCancelled();
      logger.log(
        `Scrolling down attack bar (${i + 1}/${ARROW_DOWN_MAX_ATTEMPTS})...`
      );
      if (
        await backend.isVisible(
          "ui/attacks/attack_arrow_down",
          undefined,
          token
        )
      ) {
        await backend.findAndClick(
          "ui/attacks/attack_arrow_down",
          undefined,
          token
        );
        const found = await quickFindCompass();
        if (found) {
          return true;
        }
      }
    }
    return false;
  };

  compassFound = await quickFindCompass();

  if (!compassFound) {
    compassFound = await scrollAndFindCompass();
  }

  if (!compassFound) {
    logger.log("Compass not found. Opening attacks bar...");
    const attacksClicked = await backend.findAndClick(
      "ui/attacks/attacks",
      undefined,
      token
    );

    if (attacksClicked) {
      compassFound = await quickFindCompass();

      if (!compassFound) {
        compassFound = await scrollAndFindCompass();
      }
    }
  }

  if (!compassFound) {
    throw new Error("Compass skill not found on attack bar");
  }
};

export const scrollInAtCenter = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"],
  center: Point
): Promise<void> => {
  logger.log(`Scrolling in ${SCROLL_IN_TIMES} times...`);
  await backend.scroll(center, WHEEL_DELTA, { times: SCROLL_IN_TIMES }, token);
};

export const findAnyNode = async (
  backend: ScriptContext["backend"],
  token: ScriptContext["token"],
  logger: ScriptContext["logger"]
): Promise<{ id: string; point: Point }> => {
  logger.log("Scanning for any visible node...");
  const maxLen = Math.max(...COMPASS_NODE_GROUPS.map((g) => g.nodes.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of COMPASS_NODE_GROUPS) {
      if (i >= group.nodes.length) {
        continue;
      }
      const node = group.nodes[i]!;
      token.throwIfCancelled();
      if (await backend.isVisible(node.image, undefined, token)) {
        const result = await backend.find(node.image, undefined, token);
        if (result.matches.length > 0) {
          logger.log(`Found node: ${node.id}`);
          return { id: node.id, point: result.matches[0]! };
        }
      }
    }
  }
  throw new Error("No compass node found on screen");
};
