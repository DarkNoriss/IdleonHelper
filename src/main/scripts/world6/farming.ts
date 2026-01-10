import { backendCommand } from "../../backend"
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

        // Search for all images in parallel using findWithDebug
        const [og3Result, og4Result, og5Result] = await Promise.all([
          backendCommand.findWithDebug("farming/og-3", undefined, token),
          backendCommand.findWithDebug("farming/og-4", undefined, token),
          backendCommand.findWithDebug("farming/og-5", undefined, token),
        ])

        // Collect all matches into a single array
        const allMatches = [
          ...og3Result.matches,
          ...og4Result.matches,
          ...og5Result.matches,
        ]

        if (allMatches.length === 0) {
          logger.log("No farming images found, waiting before next iteration...")
          await delay(1000, token) // Wait 1 second before trying again
          continue
        }

        logger.log(
          `Found ${allMatches.length} farming images (og-3: ${og3Result.matches.length}, og-4: ${og4Result.matches.length}, og-5: ${og5Result.matches.length})`
        )

        // Log matches with coordinates and similarity scores
        if (og3Result.matches.length > 0) {
          logger.log(
            `og-3 matches (${og3Result.matches.length}): ${og3Result.matches
              .map(
                (m) =>
                  `(${m.point.x}, ${m.point.y}) similarity=${(m.similarity * 100).toFixed(2)}%`
              )
              .join(", ")}`
          )
        }
        if (og4Result.matches.length > 0) {
          logger.log(
            `og-4 matches (${og4Result.matches.length}): ${og4Result.matches
              .map(
                (m) =>
                  `(${m.point.x}, ${m.point.y}) similarity=${(m.similarity * 100).toFixed(2)}%`
              )
              .join(", ")}`
          )
        }
        if (og5Result.matches.length > 0) {
          logger.log(
            `og-5 matches (${og5Result.matches.length}): ${og5Result.matches
              .map(
                (m) =>
                  `(${m.point.x}, ${m.point.y}) similarity=${(m.similarity * 100).toFixed(2)}%`
              )
              .join(", ")}`
          )
        }

        // Show similarity statistics
        const allSimilarities = allMatches.map((m) => m.similarity)
        const minSimilarity = Math.min(...allSimilarities)
        const maxSimilarity = Math.max(...allSimilarities)
        const avgSimilarity =
          allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length
        logger.log(
          `Similarity stats - Min: ${(minSimilarity * 100).toFixed(2)}%, Max: ${(maxSimilarity * 100).toFixed(2)}%, Avg: ${(avgSimilarity * 100).toFixed(2)}%`
        )

        // Log debug image paths if available
        if (og3Result.debugImagePath) {
          logger.log(`Debug image for og-3: ${og3Result.debugImagePath}`)
        }
        if (og4Result.debugImagePath) {
          logger.log(`Debug image for og-4: ${og4Result.debugImagePath}`)
        }
        if (og5Result.debugImagePath) {
          logger.log(`Debug image for og-5: ${og5Result.debugImagePath}`)
        }

        // Note: Threshold used for matching is 0.925 (92.5%) from backendConfig.find.threshold
        // Similarity scores show how close each match is (higher = better match)

        // Click functionality commented out
        // const presetOptions = getClickOptionsFromPreset(ClickPreset.UltraFast)
        // for (const match of allMatches) {
        //   token.throwIfCancelled()
        //   await backendCommand.click(match.point, presetOptions, token)
        // }

        logger.log(`Would click on ${allMatches.length} farming images`)

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
