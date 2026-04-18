import type { HsvColor } from "../../backend/backend-types";
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

  const initial = await backendCommand.isVisibleParallel(
    { confirmation: confirmationImage, button: buttonImage },
    undefined,
    token
  );

  if ((initial.confirmation?.length ?? 0) > 0) {
    logger.log(`${screenName} already opened`);
    return true;
  }

  if ((initial.button?.length ?? 0) === 0) {
    if (!fallback) {
      logger.error(`${screenName} button not found and no fallback available`);
      return false;
    }

    logger.log(`${screenName} button not found, falling back...`);
    const fallbackResult = await fallback(token);
    if (!fallbackResult) {
      return false;
    }

    const postFallbackCheck = await backendCommand.isVisible(
      confirmationImage,
      undefined,
      token
    );
    if (postFallbackCheck.length > 0) {
      logger.log(`${screenName} already opened after fallback`);
      return true;
    }
  }

  const clicked = await backendCommand.findAndClick(
    buttonImage,
    undefined,
    token
  );
  if (!clicked) {
    logger.error(`${screenName} button not found, navigation failed`);
    return false;
  }

  const confirmationResult = await backendCommand.find(
    confirmationImage,
    undefined,
    token
  );
  if (confirmationResult.length > 0) {
    logger.log(`${screenName} opened successfully`);
    return true;
  }

  logger.error(
    `Failed to navigate to ${screenName} - ${confirmationImage} not visible after clicking`
  );
  return false;
};

export const navigateToHSV = async (
  confirmationImage: string,
  buttonImage: string,
  hsvBounds: { hsvLower: HsvColor; hsvUpper: HsvColor },
  fallback: ((token: CancellationToken) => Promise<boolean>) | undefined,
  token: CancellationToken,
  screenName = "target screen"
): Promise<boolean> => {
  logger.log(`Navigating to ${screenName}...`);

  const initial = await backendCommand.isVisibleHSVParallel(
    { confirmation: confirmationImage, button: buttonImage },
    hsvBounds.hsvLower,
    hsvBounds.hsvUpper,
    undefined,
    token
  );

  if ((initial.confirmation?.length ?? 0) > 0) {
    logger.log(`${screenName} already opened`);
    return true;
  }

  if ((initial.button?.length ?? 0) === 0) {
    if (!fallback) {
      logger.error(`${screenName} button not found and no fallback available`);
      return false;
    }

    logger.log(`${screenName} button not found, falling back...`);
    const fallbackResult = await fallback(token);
    if (!fallbackResult) {
      return false;
    }

    const postFallbackCheck = await backendCommand.isVisibleHSV(
      confirmationImage,
      hsvBounds.hsvLower,
      hsvBounds.hsvUpper,
      undefined,
      token
    );
    if (postFallbackCheck.length > 0) {
      logger.log(`${screenName} already opened after fallback`);
      return true;
    }
  }

  const clickTargets = await backendCommand.findHSV(
    buttonImage,
    hsvBounds.hsvLower,
    hsvBounds.hsvUpper,
    undefined,
    token
  );
  if (clickTargets.length === 0) {
    logger.error(`${screenName} button not found, navigation failed`);
    return false;
  }
  await backendCommand.click(clickTargets[0]!, undefined, token);

  const confirmationResult = await backendCommand.findHSV(
    confirmationImage,
    hsvBounds.hsvLower,
    hsvBounds.hsvUpper,
    undefined,
    token
  );
  if (confirmationResult.length > 0) {
    logger.log(`${screenName} opened successfully`);
    return true;
  }

  logger.error(
    `Failed to navigate to ${screenName} - ${confirmationImage} not visible after clicking`
  );
  return false;
};
