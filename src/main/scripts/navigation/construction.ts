import { backendCommand } from "../../backend"
import { logger } from "../../utils"
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
      "construction/total-build-rate",
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
} as const

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
