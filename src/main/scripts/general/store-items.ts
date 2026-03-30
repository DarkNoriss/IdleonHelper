import { backendCommand } from "../../backend";
import { cancellationManager, logger } from "../../utils";
import { navigation } from "../navigation";

export const storeItems = {
  run: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running");
    }

    logger.log("Starting store items script");
    // Create cancellation token
    const token = cancellationManager.createToken();

    try {
      token.throwIfCancelled();
      logger.log("Store items script: navigating to Storage...");
      await navigation.quickRef.toStorage(token);

      // Check if deposit_all.png is visible (quick check with 100ms timeout)
      token.throwIfCancelled();
      logger.log("Checking if deposit_all button is visible...");
      const isDepositAllVisible = await backendCommand.isVisible(
        "storage/deposit_all",
        undefined,
        token
      );

      if (isDepositAllVisible) {
        logger.log("deposit_all button is visible, clicking it...");
        const clicked = await backendCommand.findAndClick(
          "storage/deposit_all",
          undefined,
          token
        );
        if (!clicked) {
          logger.log("Failed to click deposit_all button");
        }
      } else {
        logger.log(
          "deposit_all button not visible, clicking info.png to open info screen..."
        );
        const infoClicked = await backendCommand.findAndClick(
          "storage/info",
          undefined,
          token
        );
        if (infoClicked) {
          logger.log("Info screen opened, now clicking deposit_all...");
          const depositAllClicked = await backendCommand.findAndClick(
            "storage/deposit_all",
            undefined,
            token
          );
          if (!depositAllClicked) {
            logger.log("Failed to click deposit_all button after opening info");
          }
        } else {
          logger.log("Failed to click info.png");
        }
      }

      // Click deposit_cash.png
      token.throwIfCancelled();
      logger.log("Clicking deposit_cash button...");
      const depositCashClicked = await backendCommand.findAndClick(
        "storage/deposit_cash",
        undefined,
        token
      );
      if (!depositCashClicked) {
        logger.log("Failed to click deposit_cash button");
      }

      // Click deposit_cash_max.png
      token.throwIfCancelled();
      logger.log("Clicking deposit_cash_max button...");
      const depositCashMaxClicked = await backendCommand.findAndClick(
        "storage/deposit_cash_max",
        undefined,
        token
      );
      if (!depositCashMaxClicked) {
        logger.log("Failed to click deposit_cash_max button");
      }

      // Click ui/items.png
      token.throwIfCancelled();
      logger.log("Clicking ui/items button...");
      const itemsClicked = await backendCommand.findAndClick(
        "ui/items",
        undefined,
        token
      );
      if (!itemsClicked) {
        logger.log("Failed to click ui/items button");
      }

      logger.log("Store items script completed successfully");
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Store items script operation was cancelled");
        return; // Return gracefully without throwing
      }
      // Re-throw actual errors
      throw error;
    } finally {
      // Clean up
      cancellationManager.clearToken();
    }
  },
} as const;
