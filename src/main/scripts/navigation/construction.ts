import { backendCommand } from "../../backend"
import { delay, logger } from "../../utils"
import type { CancellationToken } from "../../utils/cancellation-token"
import { codex } from "./codex"
import { navigateTo } from "./helpers"

export const construction = {
  toConstruction: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "construction/cogs_tab",
      "quik-ref/construction",
      codex.toQuikRef,
      token,
      "Construction"
    )
  },
  toCogsTab: async (token: CancellationToken): Promise<boolean> => {
    return await navigateTo(
      "construction/flaggy-rate",
      "construction/cogs_tab",
      construction.toConstruction,
      token,
      "Cogs Tab"
    )
  },
  ensureFirstPage: async (token: CancellationToken): Promise<boolean> => {
    return await ensurePage(
      "construction/cogs-page-prev",
      "construction/cogs-page-prev-off",
      "first page",
      "previous button",
      token
    )
  },
  ensureLastPage: async (token: CancellationToken): Promise<boolean> => {
    return await ensurePage(
      "construction/cogs-page-next",
      "construction/cogs-page-next-off",
      "last page",
      "next button",
      token
    )
  },
  ensureCogShelfOff: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "construction/cogs-shelf-off",
      "construction/cogs-shelf",
      "cog shelf",
      "off",
      token
    )
  },
  ensureCogShelfOn: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "construction/cogs-shelf",
      "construction/cogs-shelf-off",
      "cog shelf",
      "on",
      token
    )
  },
  ensureTrashOff: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "construction/cogs-trash-off",
      "construction/cogs-trash",
      "trash",
      "off",
      token
    )
  },
  ensureTrashOn: async (token: CancellationToken): Promise<boolean> => {
    return await ensureToggle(
      "construction/cogs-trash",
      "construction/cogs-trash-off",
      "trash",
      "on",
      token
    )
  },
  navigateToPage: async (
    targetPage: number,
    token: CancellationToken
  ): Promise<number> => {
    const isOnTargetPage = await backendCommand.isVisible(
      `construction/page-${targetPage}`,
      { threshold: 0.975 },
      token
    )
    if (isOnTargetPage) {
      logger.log(`Already on page ${targetPage}`)
      return targetPage
    }

    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      attempts++

      const detectedPage = await detectCurrentPage(token)
      if (detectedPage === null) {
        throw new Error(
          `Cannot detect current page after navigation attempt ${attempts}`
        )
      }

      if (detectedPage === targetPage) {
        logger.log(`Successfully navigated to page ${targetPage}`)
        return targetPage
      }

      const pageDiff = targetPage - detectedPage
      const buttonImage =
        pageDiff > 0
          ? "construction/cogs-page-next"
          : "construction/cogs-page-prev"

      const result = await backendCommand.find(buttonImage, undefined, token)
      if (result.matches.length === 0) {
        throw new Error(
          `Page navigation button not found. Target: ${targetPage}, Detected: ${detectedPage}, Attempt: ${attempts}`
        )
      }

      const buttonPoint = result.matches[0]
      const clicksNeeded = Math.abs(pageDiff)

      logger.log(
        `Attempt ${attempts}: Navigating from page ${detectedPage} to page ${targetPage} (${clicksNeeded} clicks)`
      )

      await backendCommand.click(
        buttonPoint,
        { times: clicksNeeded, interval: 25, holdTime: 10 },
        token
      )

      await delay(100, token)

      const verifyPage = await backendCommand.isVisible(
        `construction/page-${targetPage}`,
        { threshold: 0.975 },
        token
      )
      if (verifyPage) {
        logger.log(
          `Successfully navigated to page ${targetPage} on attempt ${attempts}`
        )
        return targetPage
      }

      logger.log(
        `Attempt ${attempts} failed: Still not on page ${targetPage} after navigation`
      )
    }

    const finalDetectedPage = await detectCurrentPage(token)
    throw new Error(
      `Failed to navigate to page ${targetPage} after ${maxAttempts} attempts. Final detected page: ${finalDetectedPage ?? "unknown"}`
    )
  },
} as const

const detectCurrentPage = async (
  token: CancellationToken
): Promise<number | null> => {
  for (let page = 1; page <= 7; page++) {
    const isVisible = await backendCommand.isVisible(
      `construction/page-${page}`,
      { threshold: 0.975 },
      token
    )
    if (isVisible) {
      return page
    }
  }
  return null
}

const ensurePage = async (
  buttonImage: string,
  confirmationImage: string,
  pageName: string,
  buttonName: string,
  token: CancellationToken
): Promise<boolean> => {
  logger.log(`Ensuring we are on the ${pageName}...`)

  const isOnTargetPage = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  )
  if (isOnTargetPage) {
    logger.log(`Already on ${pageName}`)
    return true
  }

  const result = await backendCommand.find(buttonImage, undefined, token)

  if (result.matches.length === 0) {
    logger.log(`${buttonName} not found, assuming we're on ${pageName}`)
    return true
  }

  const buttonPoint = result.matches[0]

  logger.log(`Clicking ${buttonName} 12 times...`)
  await backendCommand.click(
    buttonPoint,
    {
      times: 12,
      interval: 25,
      holdTime: 10,
    },
    token
  )

  const finalCheck = await backendCommand.find(
    confirmationImage,
    undefined,
    token
  )
  if (finalCheck.matches.length > 0) {
    logger.log(`Reached ${pageName}`)
    return true
  }

  logger.log(`Still not on ${pageName} after 12 clicks`)
  return false
}

const ensureToggle = async (
  confirmationImage: string,
  buttonImage: string,
  itemName: string,
  targetState: string,
  token: CancellationToken
): Promise<boolean> => {
  logger.log(`Ensuring ${itemName} is ${targetState}...`)

  const isInTargetState = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  )
  if (isInTargetState) {
    logger.log(`${itemName} is already ${targetState}`)
    return true
  }

  const clicked = await backendCommand.findAndClick(
    buttonImage,
    undefined,
    token
  )
  if (!clicked) {
    logger.log(
      `${itemName} button not found, assuming it's already ${targetState}`
    )
    return true
  }

  const finalCheck = await backendCommand.isVisible(
    confirmationImage,
    undefined,
    token
  )
  if (finalCheck) {
    logger.log(`${itemName} is now ${targetState}`)
    return true
  }

  logger.log(`Failed to turn ${itemName} ${targetState}`)
  return false
}
