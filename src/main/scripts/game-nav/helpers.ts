import { backendCommand } from "../../backend/index";
import type { CancellationToken } from "../../utils/cancellation-token";
import { logger } from "../../utils/index";

export const navigateTo = async (
  confirmationImage: string,
  buttonImage: string,
  fallback: ((token: CancellationToken) => Promise<boolean>) | undefined,
  token: CancellationToken,
  screenName = "target screen"
): Promise<boolean> => {
  logger.log(`Navigating to ${screenName}...`);

  // Step 1: Quick check if already open
  const initialCheck = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  );
  if (initialCheck) {
    logger.log(`${screenName} already opened`);
    return true;
  }

  // Step 2: Check if button is visible
  const isButtonVisible = await backendCommand.isVisible(
    buttonImage,
    undefined,
    token
  );

  // Step 3: If button not visible and fallback provided, call fallback
  if (!isButtonVisible) {
    if (!fallback) {
      logger.error(`${screenName} button not found and no fallback available`);
      return false;
    }

    logger.log(`${screenName} button not found, falling back...`);
    const fallbackResult = await fallback(token);
    if (!fallbackResult) {
      return false;
    }

    // Step 4: Re-check confirmation after fallback
    // Handles case where target is already open after parent navigation
    // (e.g. Quick Ref saves last-opened tab, so opening Codex may reveal it)
    const postFallbackCheck = await backendCommand.isVisible(
      confirmationImage,
      undefined,
      token
    );
    if (postFallbackCheck) {
      logger.log(`${screenName} already opened after fallback`);
      return true;
    }
  }

  // Step 5: Find and click the button
  const clicked = await backendCommand.findAndClick(
    buttonImage,
    undefined,
    token
  );
  if (!clicked) {
    logger.error(`${screenName} button not found, navigation failed`);
    return false;
  }

  // Step 6: Wait for confirmation using find (5s retry) instead of isVisible (50ms)
  // This gives the UI time to transition after clicking
  const confirmationResult = await backendCommand.find(
    confirmationImage,
    undefined,
    token
  );
  if (confirmationResult.matches.length > 0) {
    logger.log(`${screenName} opened successfully`);
    return true;
  }

  logger.error(
    `Failed to navigate to ${screenName} - ${confirmationImage} not visible after clicking`
  );
  return false;
};
