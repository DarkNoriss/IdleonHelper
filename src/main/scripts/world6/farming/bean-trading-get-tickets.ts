import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";
import { pressKey } from "../../keys";
import {
  BEAN_TRADING_TICKET_COUNT,
  INVENTORY_CENTER,
  STORAGE_CENTER,
} from "./farming-constants";

const SCROLL_DELTA = 120;
const STORAGE_PATH = "ui/codex/quik-ref/storage";

export default defineScript({
  id: "world6.farming.beanTradingGetTickets",
  name: "Bean Trading - Get Tickets",
  run: async ({ token }) => {
    // 1. Navigate to storage
    token.throwIfCancelled();
    if (STORAGE_CENTER.x === 0 && STORAGE_CENTER.y === 0) {
      logger.log(
        "bean-trading-get-tickets - STORAGE_CENTER not configured, run debug script first"
      );
      return;
    }
    if (INVENTORY_CENTER.x === 0 && INVENTORY_CENTER.y === 0) {
      logger.log(
        "bean-trading-get-tickets - INVENTORY_CENTER not configured, run debug script first"
      );
      return;
    }
    logger.log("bean-trading-get-tickets - navigating to storage");
    await navigation.quickRef.toStorage(token);

    // 2. Ensure small mode is OFF
    token.throwIfCancelled();
    const smallModeOn = await backendCommand.isVisible(
      `${STORAGE_PATH}/storage_small_mode`,
      undefined,
      token
    );
    if (smallModeOn.length > 0) {
      logger.log("bean-trading-get-tickets - turning off small mode");
      const clicked = await backendCommand.findAndClick(
        `${STORAGE_PATH}/storage_small_mode`,
        undefined,
        token
      );
      if (!clicked) {
        logger.log(
          "bean-trading-get-tickets - failed to click small mode toggle"
        );
      }
    }

    // 3. Ensure split stack is ON
    token.throwIfCancelled();
    const splitStackOff = await backendCommand.isVisible(
      `${STORAGE_PATH}/storage_split_stack_off`,
      undefined,
      token
    );
    if (splitStackOff.length > 0) {
      logger.log("bean-trading-get-tickets - enabling split stack");
      const clicked = await backendCommand.findAndClick(
        `${STORAGE_PATH}/storage_split_stack_off`,
        undefined,
        token
      );
      if (!clicked) {
        logger.log(
          "bean-trading-get-tickets - failed to click split stack toggle"
        );
      }
    }

    // 4. Scroll storage to first page (scroll up to go back to first tab)
    token.throwIfCancelled();
    logger.log("bean-trading-get-tickets - scrolling storage to first page");
    await backendCommand.scroll(
      STORAGE_CENTER,
      SCROLL_DELTA,
      { times: 30 },
      token
    );

    // 5. Find the ticket in storage (scroll down page by page, up to 30 times)
    token.throwIfCancelled();
    logger.log("bean-trading-get-tickets - looking for crop transfer ticket");
    let ticketVisible = await backendCommand.isVisibleWithDebug(
      "game-items/crop_transfer_ticket",
      undefined,
      token
    );
    for (let page = 1; ticketVisible.length === 0 && page <= 30; page++) {
      logger.log(
        `bean-trading-get-tickets - ticket not found, scrolling down (${page}/30)`
      );
      await backendCommand.scroll(
        STORAGE_CENTER,
        -SCROLL_DELTA,
        undefined,
        token
      );
      ticketVisible = await backendCommand.isVisibleWithDebug(
        "game-items/crop_transfer_ticket",
        undefined,
        token
      );
    }
    if (ticketVisible.length === 0) {
      logger.log("bean-trading-get-tickets - ticket not found in storage");
      return;
    }

    // 6. Click the ticket (triggers split popup)
    token.throwIfCancelled();
    logger.log("bean-trading-get-tickets - clicking ticket");
    await backendCommand.findAndClick(
      "game-items/crop_transfer_ticket",
      undefined,
      token
    );

    // 7. Find and cache OK button position
    token.throwIfCancelled();
    const okResults = await backendCommand.find(
      `${STORAGE_PATH}/storage_ok`,
      undefined,
      token
    );
    if (okResults.length === 0) {
      logger.log("bean-trading-get-tickets - OK button not found");
      return;
    }
    const okPosition = okResults[0]!;
    logger.log(
      `bean-trading-get-tickets - OK button cached at (${okPosition.x}, ${okPosition.y})`
    );

    // 8. Loop: split and drag tickets to empty inventory slots
    const usedSlots: Array<{ x: number; y: number }> = [];
    for (let i = 1; i <= BEAN_TRADING_TICKET_COUNT; i++) {
      token.throwIfCancelled();

      // Find empty inventory slots and pick one we haven't used yet
      let emptySlots = await backendCommand.find(
        `${STORAGE_PATH}/storage_empty`,
        undefined,
        token
      );
      let targetSlot = emptySlots.find(
        (slot) =>
          !usedSlots.some((used) => used.x === slot.x && used.y === slot.y)
      );

      if (!targetSlot) {
        logger.log(
          "bean-trading-get-tickets - no empty slot, scrolling inventory"
        );
        await backendCommand.scroll(
          INVENTORY_CENTER,
          -SCROLL_DELTA,
          undefined,
          token
        );
        usedSlots.length = 0;
        emptySlots = await backendCommand.find(
          `${STORAGE_PATH}/storage_empty`,
          undefined,
          token
        );
        targetSlot = emptySlots[0];
      }

      if (!targetSlot) {
        logger.log(
          "bean-trading-get-tickets - no empty slots available, stopping"
        );
        break;
      }

      usedSlots.push(targetSlot);
      await backendCommand.drag(okPosition, targetSlot, undefined, token);
      logger.log(
        `bean-trading-get-tickets - ticket ${i}/${BEAN_TRADING_TICKET_COUNT}`
      );
    }

    // 9. Close storage
    token.throwIfCancelled();
    await pressKey("ESCAPE", token);
    logger.log("bean-trading-get-tickets - done");
  },
});
