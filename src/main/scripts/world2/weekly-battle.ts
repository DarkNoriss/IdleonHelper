import { backendCommand } from "../../backend/backend-command";
import { getMainWindow } from "../../index";
import { logger } from "../../utils";
import { defineScript } from "../define-script";
import {
  fetchWeeklyBattleData,
  type WeeklyBattleData,
} from "./weekly-battle-data";

// Coordinate constants for weekly battle steps
const STEP_1_COORDS = { x: 613, y: 337 };
const STEP_2_COORDS = { x: 613, y: 398 };
const STEP_3_COORDS = { x: 613, y: 459 };

let data: WeeklyBattleData | null = null;
const onChangeCallbacks: Array<(data: WeeklyBattleData | null) => void> = [];

const notifyChange = (newData: WeeklyBattleData | null): void => {
  data = newData;
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("weekly-battle-data-changed", newData);
  }
  for (const callback of onChangeCallbacks) {
    callback(newData);
  }
};

export const weeklyBattleFetch = async (): Promise<WeeklyBattleData> => {
  logger.log("Fetching weekly battle data...");
  const fetchedData = await fetchWeeklyBattleData();
  notifyChange(fetchedData);
  logger.log("Weekly battle data fetched successfully");
  return fetchedData;
};

export const weeklyBattleGet = async (): Promise<WeeklyBattleData | null> => {
  return data;
};

export const weeklyBattleOnChange = (
  callback: (data: WeeklyBattleData | null) => void
): (() => void) => {
  onChangeCallbacks.push(callback);
  callback(data);
  return () => {
    const index = onChangeCallbacks.indexOf(callback);
    if (index > -1) {
      onChangeCallbacks.splice(index, 1);
    }
  };
};

export default defineScript<[number[]]>({
  id: "world2.weeklyBattle.run",
  name: "Weekly Battle Run",
  run: async ({ args: [steps], token, logger }) => {
    logger.log(`Weekly battle steps: ${steps.join(", ")}`);

    // Note: do not run these concurrently. The backend window capture is not safe
    // under parallel requests and can time out without producing a frame.
    logger.log("Checking weekly battle state (cooldown, restart, select)...");
    const isOnCooldown = await backendCommand.isVisible(
      "weekly-battle/wait",
      undefined,
      token
    );
    const needsRestart = await backendCommand.isVisible(
      "weekly-battle/restart",
      undefined,
      token
    );
    const isSelectVisible = await backendCommand.isVisible(
      "weekly-battle/select",
      undefined,
      token
    );

    // Step 1: Check if weekly battle is on cooldown
    if (isOnCooldown) {
      logger.log("Weekly battle is on cooldown - cannot proceed");
      return;
    }

    // Step 2: Check if restart is needed
    if (needsRestart) {
      logger.log("Restarting weekly battle...");

      const clicked = await backendCommand.click(
        STEP_1_COORDS,
        undefined,
        token
      );
      if (clicked) {
        logger.log("Weekly battle restarted successfully");
        // Re-check select screen after restart
        const isSelectVisibleAfterRestart = await backendCommand.isVisible(
          "weekly-battle/select",
          undefined,
          token
        );
        if (!isSelectVisibleAfterRestart) {
          logger.error("Weekly battle select screen not found after restart");
          throw new Error("Weekly battle select screen not found");
        }
        logger.log("Select screen confirmed after restart");
      } else {
        logger.error("Restart image found but no matches returned");
      }
    } else {
      // Step 3: Verify we're on the select screen (only if no restart was needed)
      if (!isSelectVisible) {
        logger.error("Weekly battle select screen not found");
        throw new Error("Weekly battle select screen not found");
      }
      logger.log("Select screen confirmed");
    }

    // Step 4: Execute steps by clicking coordinates
    logger.log(`Executing ${steps.length} steps...`);
    const stepCoords = [STEP_1_COORDS, STEP_2_COORDS, STEP_3_COORDS];

    for (const stepNumber of steps) {
      // Validate step number (should be 1, 2, or 3)
      if (stepNumber < 1 || stepNumber > 3) {
        logger.error(
          `Invalid step number: ${stepNumber}. Expected 1, 2, or 3.`
        );
        throw new Error(`Invalid step number: ${stepNumber}`);
      }

      const coords = stepCoords[stepNumber - 1]!;
      logger.log(
        `Clicking step ${stepNumber} at coordinates (${coords.x}, ${coords.y})`
      );

      await backendCommand.click(coords, undefined, token);
    }
  },
});
