import {
  backendCommand,
  backendConfig,
  ClickPreset,
  getClickOptionsFromPreset,
} from "../../backend"
import { cancellationManager, logger } from "../../utils"

export const start = async (): Promise<void> => {
  if (cancellationManager.getStatus().isWorking) {
    throw new Error("Another operation is already running")
  }

  logger.log("Starting farming")
  const token = cancellationManager.createToken()

  try {
    while (!token.isCancelled()) {
      token.throwIfCancelled()
      logger.log("Searching for farming images with threshold 99.25%...")

      const threshold = 0.9925
      const findOptions = {
        threshold,
        timeoutMs: backendConfig.isVisible.timeoutMs,
        intervalMs: backendConfig.find.intervalMs,
      }

      const [og3Result, og4Result, og5Result] = await Promise.all([
        backendCommand.find("farming/og-3", findOptions, token),
        backendCommand.find("farming/og-4", findOptions, token),
        backendCommand.find("farming/og-5", findOptions, token),
      ])

      const allCoordinates = [
        ...og3Result.matches,
        ...og4Result.matches,
        ...og5Result.matches,
      ]

      if (allCoordinates.length === 0) {
        logger.log("No farming images found, waiting before next iteration...")
        continue
      }

      logger.log(
        `Found ${allCoordinates.length} farming images (og-3: ${og3Result.matches.length}, og-4: ${og4Result.matches.length}, og-5: ${og5Result.matches.length})`
      )

      if (og3Result.matches.length > 0) {
        logger.log(
          `og-3 matches (${og3Result.matches.length}): ${og3Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        )
      }
      if (og4Result.matches.length > 0) {
        logger.log(
          `og-4 matches (${og4Result.matches.length}): ${og4Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        )
      }
      if (og5Result.matches.length > 0) {
        logger.log(
          `og-5 matches (${og5Result.matches.length}): ${og5Result.matches
            .map((m) => `(${m.x}, ${m.y})`)
            .join(", ")}`
        )
      }

      const presetOptions = getClickOptionsFromPreset(ClickPreset.Extreme)
      for (const coordinate of allCoordinates) {
        token.throwIfCancelled()
        await backendCommand.click(coordinate, presetOptions, token)
      }

      logger.log(`Clicked on ${allCoordinates.length} farming images`)
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Operation was cancelled") {
      logger.log("Farming operation was cancelled")
      return
    }
    throw error
  } finally {
    cancellationManager.clearToken()
  }
}
