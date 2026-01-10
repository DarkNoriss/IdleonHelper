import {
  backendCommand,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend"
import { cancellationManager, delay, logger } from "../../utils"

export const farming = {
  start: async (): Promise<void> => {
    // Check if already working
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running")
    }

    logger.log("Starting farming")
    // Create cancellation token
    const token = cancellationManager.createToken()

    try {
      while (!token.isCancelled()) {
        token.throwIfCancelled()
        logger.log("Searching for farming images...")

        // Search for all images in parallel
        const [og3Result, og4Result, og5Result] = await Promise.all([
          backendCommand.find("farming/og-3", undefined, token),
          backendCommand.find("farming/og-4", undefined, token),
          backendCommand.find("farming/og-5", undefined, token),
        ])

        // Collect all coordinates into a single array
        const allCoordinates = [
          ...og3Result.matches,
          ...og4Result.matches,
          ...og5Result.matches,
        ]

        if (allCoordinates.length === 0) {
          logger.log("No farming images found, waiting before next iteration...")
          await delay(1000, token) // Wait 1 second before trying again
          continue
        }

        logger.log(
          `Found ${allCoordinates.length} farming images (og-3: ${og3Result.matches.length}, og-4: ${og4Result.matches.length}, og-5: ${og5Result.matches.length})`
        )

        // Get ultra-fast click options
        const presetOptions = getClickOptionsFromPreset(ClickPreset.UltraFast)

        // Click on each coordinate
        for (const coordinate of allCoordinates) {
          token.throwIfCancelled()
          await backendCommand.click(coordinate, presetOptions, token)
        }

        logger.log(`Clicked on ${allCoordinates.length} farming images`)

        // Small delay before next iteration
        await delay(500, token)
      }
    } catch (error) {
      // Handle cancellation silently - it's a user action, not an error
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log("Farming operation was cancelled")
        return // Return gracefully without throwing
      }
      // Re-throw actual errors
      throw error
    } finally {
      // Clean up
      cancellationManager.clearToken()
    }
  },
} as const
