import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";

const MAP_PATH = "ui/map";
const WORLD6_PATH = "ui/map/world-6";
const TRADER_PATH = "ui/map/world-6/troll-broodnest";
const TOWN_PATH = "ui/map/world-6/town";
const FARMING_PATH = "ui/map/world-6/town/farming";

export default defineScript({
  id: "world6.farming.beanTradingTradeCropsDebug",
  name: "Bean Trading - Trade Crops Debug",
  run: async ({ token }) => {
    logger.log("bean-trading-trade-crops-debug - starting debug checks");

    const images = [
      { name: "map button", path: "ui/map" },
      { name: "world 1 (map confirmation)", path: `${MAP_PATH}/world_1` },
      { name: "world 6 tab", path: `${MAP_PATH}/world_6` },
      { name: "troll broodnest node", path: `${WORLD6_PATH}/troll_broodnest` },
      { name: "legumulyte feet", path: `${TRADER_PATH}/legumulyte_feet` },
      { name: "legumulyte dialog", path: `${TRADER_PATH}/legumulyte_dialog` },
      { name: "farming station", path: `${TOWN_PATH}/farming_station` },
      { name: "compost bag", path: `${FARMING_PATH}/compost_bag` },
      { name: "crop transfer ticket", path: "game-items/crop_transfer_ticket" },
      { name: "inventory tab 1", path: "ui/items/tab_1" },
    ];

    for (const image of images) {
      const results = await backendCommand.isVisibleWithDebug(
        image.path,
        undefined,
        token
      );
      if (results.length > 0) {
        const point = results[0]!;
        logger.log(
          `bean-trading-trade-crops-debug - ${image.name} found at (${point.x}, ${point.y})`
        );
      } else {
        logger.log(`bean-trading-trade-crops-debug - ${image.name} not found`);
      }
    }

    // Drop test: open inventory, find ticket, drag to tab_1 position with -20 Y offset
    logger.log("bean-trading-trade-crops-debug - starting drop test");
    const itemsOpened = await navigation.ui.toItems(token);
    if (!itemsOpened) {
      logger.log("bean-trading-trade-crops-debug - failed to open inventory");
      return;
    }

    const ticket = await backendCommand.isVisibleWithDebug(
      "game-items/crop_transfer_ticket",
      undefined,
      token
    );
    if (ticket.length === 0) {
      logger.log(
        "bean-trading-trade-crops-debug - ticket not found in inventory"
      );
      return;
    }

    const tab1 = await backendCommand.isVisibleWithDebug(
      "ui/items/tab_1",
      undefined,
      token
    );
    if (tab1.length === 0) {
      logger.log("bean-trading-trade-crops-debug - tab_1 not found");
      return;
    }

    const dropTarget = { x: tab1[0]!.x, y: tab1[0]!.y - 20 };
    logger.log(
      `bean-trading-trade-crops-debug - tab_1 at (${tab1[0]!.x}, ${tab1[0]!.y}), dropping at (${dropTarget.x}, ${dropTarget.y})`
    );

    await backendCommand.drag(ticket[0]!, dropTarget, { instant: true }, token);

    logger.log("bean-trading-trade-crops-debug - done");
  },
});
