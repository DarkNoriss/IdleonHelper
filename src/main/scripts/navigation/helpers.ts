import { backendCommand } from "../../backend"
import { logger } from "../../utils"
import type { CancellationToken } from "../../utils/cancellation-token"

/**
 * Generic navigation helper function that follows the standard navigation pattern:
 * 1. Check if target screen is already open (using isVisible on confirmation image)
 * 2. If not open, check if button is visible (using isVisible on button image)
 * 3. If button not visible, call fallback function
 * 4. After fallback (or if button was visible), find and click the button
 * 5. Confirm navigation succeeded by checking confirmation image with isVisible
 *
 * @param confirmationImage - Image path to check if the target screen is already open
 * @param buttonImage - Image path of the button to click for navigation
 * @param fallback - Function to call if button is not visible
 * @param token - Cancellation token
 * @param screenName - Optional name for logging (defaults to "target screen")
 * @returns Promise<boolean> - true if navigation succeeded, false otherwise
 */
export const navigateTo = async (
  confirmationImage: string,
  buttonImage: string,
  fallback: (token: CancellationToken) => Promise<boolean>,
  token: CancellationToken,
  screenName: string = "target screen"
): Promise<boolean> => {
  logger.log(`Navigating to ${screenName}...`)

  // Check if already open using isVisible
  const initialCheck = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  )
  if (initialCheck) {
    logger.log(`${screenName} already opened`)
    return true
  }

  // Check if button is visible using isVisible
  const isButtonVisible = await backendCommand.isVisible(
    buttonImage,
    undefined,
    token
  )

  // If button not visible, call fallback
  if (!isButtonVisible) {
    logger.log(`${screenName} button not found, falling back...`)
    const fallbackResult = await fallback(token)
    if (!fallbackResult) {
      return false
    }
  }

  // After fallback (or if button was visible), find and click the button
  const clicked = await backendCommand.findAndClick(
    buttonImage,
    undefined,
    token
  )
  if (!clicked) {
    logger.error(
      `${screenName} button not found after fallback, navigation failed`
    )
    return false
  }

  // Check for confirmation using isVisible
  const confirmationCheck = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  )
  if (confirmationCheck) {
    logger.log(`${screenName} opened successfully`)
    return true
  }

  logger.error(
    `Failed to navigate to ${screenName} - ${confirmationImage} not visible after clicking`
  )
  return false
}
