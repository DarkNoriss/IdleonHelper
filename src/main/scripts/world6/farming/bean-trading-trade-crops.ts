import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";
import {
  BEAN_TRADING_TICKET_COUNT,
  FARMING_GRID,
  TICKET_DROP_TARGET,
} from "./farming-constants";

const MAP_PATH = "ui/map";
const WORLD6_PATH = "ui/map/world-6";
const TRADER_PATH = "ui/map/world-6/troll-broodnest";
const TOWN_PATH = "ui/map/world-6/town";
const FARMING_PATH = "ui/map/world-6/town/farming";

const teleportToTrader = async (token: CancellationToken): Promise<boolean> => {
  logger.log("bean-trading-trade-crops - teleporting to trader map");
  const mapOpened = await navigation.ui.toMap(token);
  if (!mapOpened) {
    logger.log("bean-trading-trade-crops - failed to open map");
    return false;
  }

  const world6Clicked = await backendCommand.findAndClick(
    `${MAP_PATH}/world_6`,
    undefined,
    token
  );
  if (!world6Clicked) {
    logger.log("bean-trading-trade-crops - world 6 tab not found");
    return false;
  }

  const broodnest = await backendCommand.find(
    `${WORLD6_PATH}/troll_broodnest`,
    undefined,
    token
  );
  if (broodnest.length === 0) {
    logger.log("bean-trading-trade-crops - troll broodnest not found");
    return false;
  }

  await backendCommand.click(broodnest[0]!, { times: 2 }, token);
  return true;
};

const walkToTrader = async (token: CancellationToken): Promise<boolean> => {
  logger.log("bean-trading-trade-crops - walking to trader");
  const feet = await backendCommand.find(
    `${TRADER_PATH}/legumulyte_feet`,
    undefined,
    token
  );
  if (feet.length === 0) {
    logger.log("bean-trading-trade-crops - legumulyte feet not found");
    return false;
  }

  await backendCommand.click(feet[0]!, undefined, token);
  return true;
};

const dropTicket = async (token: CancellationToken): Promise<boolean> => {
  logger.log("bean-trading-trade-crops - dropping ticket");
  await delay(2000, token);

  const itemsOpened = await navigation.ui.toItems(token);
  if (!itemsOpened) {
    logger.log("bean-trading-trade-crops - failed to open inventory");
    return false;
  }

  const ticket = await backendCommand.find(
    "game-items/crop_transfer_ticket",
    undefined,
    token
  );
  if (ticket.length === 0) {
    logger.log("bean-trading-trade-crops - ticket not found in inventory");
    return false;
  }

  await backendCommand.drag(
    ticket[0]!,
    TICKET_DROP_TARGET,
    { instant: true },
    token
  );

  logger.log("bean-trading-trade-crops - waiting for trade dialog");
  const dialog = await backendCommand.find(
    `${TRADER_PATH}/legumulyte_dialog`,
    undefined,
    token
  );
  if (dialog.length === 0) {
    logger.log("bean-trading-trade-crops - trade dialog did not appear");
    return false;
  }

  return true;
};

const teleportToTown = async (token: CancellationToken): Promise<boolean> => {
  logger.log("bean-trading-trade-crops - teleporting to town");
  const mapOpened = await navigation.ui.toMap(token);
  if (!mapOpened) {
    logger.log("bean-trading-trade-crops - failed to open map");
    return false;
  }

  const world6 = await backendCommand.find(
    `${MAP_PATH}/world_6`,
    undefined,
    token
  );
  if (world6.length === 0) {
    logger.log("bean-trading-trade-crops - world 6 not found");
    return false;
  }

  await backendCommand.click(world6[0]!, { times: 2 }, token);
  return true;
};

const collectCrop = async (
  plotIndex: number,
  token: CancellationToken
): Promise<boolean> => {
  logger.log(
    `bean-trading-trade-crops - collecting crop plot ${plotIndex + 1}/36`
  );

  const stationClicked = await backendCommand.findAndClick(
    `${TOWN_PATH}/farming_station`,
    undefined,
    token
  );
  if (!stationClicked) {
    logger.log("bean-trading-trade-crops - farming station not found");
    return false;
  }

  const compostBag = await backendCommand.find(
    `${FARMING_PATH}/compost_bag`,
    undefined,
    token
  );
  if (compostBag.length === 0) {
    logger.log("bean-trading-trade-crops - farming station did not open");
    return false;
  }

  await delay(1000, token);

  const col = plotIndex % FARMING_GRID.COLUMNS;
  const row = Math.floor(plotIndex / FARMING_GRID.COLUMNS);
  const cropPosition = {
    x: FARMING_GRID.FIRST_POSITION.x + col * FARMING_GRID.X_STEP,
    y: FARMING_GRID.FIRST_POSITION.y + row * FARMING_GRID.Y_STEP,
  };

  await backendCommand.click(cropPosition, undefined, token);
  return true;
};

export default defineScript({
  id: "world6.farming.beanTradingTradeCrops",
  name: "Bean Trading - Trade Crops",
  run: async ({ token }) => {
    if (TICKET_DROP_TARGET.x === 0 && TICKET_DROP_TARGET.y === 0) {
      logger.log(
        "bean-trading-trade-crops - TICKET_DROP_TARGET not configured, run debug script first"
      );
      return;
    }

    // Verify at least one ticket exists in inventory
    const itemsOpened = await navigation.ui.toItems(token);
    if (!itemsOpened) {
      logger.log("bean-trading-trade-crops - failed to open inventory");
      return;
    }
    const ticketCheck = await backendCommand.isVisible(
      "game-items/crop_transfer_ticket",
      undefined,
      token
    );
    if (ticketCheck.length === 0) {
      logger.log("bean-trading-trade-crops - no tickets found in inventory");
      return;
    }

    for (let i = 1; i <= BEAN_TRADING_TICKET_COUNT; i++) {
      token.throwIfCancelled();
      logger.log(
        `bean-trading-trade-crops - iteration ${i}/${BEAN_TRADING_TICKET_COUNT}`
      );

      // Collect crop (iterations 2-37)
      if (i > 1) {
        const townOk = await teleportToTown(token);
        if (!townOk) {
          return;
        }

        const cropOk = await collectCrop(i - 2, token);
        if (!cropOk) {
          return;
        }
      }

      // Teleport to trader and trade
      const traderOk = await teleportToTrader(token);
      if (!traderOk) {
        return;
      }

      const walkOk = await walkToTrader(token);
      if (!walkOk) {
        return;
      }

      const dropOk = await dropTicket(token);
      if (!dropOk) {
        return;
      }
    }

    logger.log("bean-trading-trade-crops - done");
  },
});
