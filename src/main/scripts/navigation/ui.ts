import { backendCommand } from "../../backend-command"

export const ui = {
  toCodex: async (): Promise<boolean> => {
    const initialCheck = await backendCommand.isVisible("codex/quik-ref")
    if (initialCheck) {
      return true
    }

    const result = await backendCommand.find("ui/codex")
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0])
    } else {
      console.log("Codex button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.isVisible("codex/quik-ref")
    if (secondCheck) {
      console.log("Codex opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/codex")
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0])
    } else {
      console.log("Codex button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible("codex/quik-ref")
    if (finalCheck) {
      console.log("Codex opened successfully after second attempt")
      return true
    }

    console.error(
      "Failed to navigate to codex - codex/quik-ref not visible after multiple attempts"
    )
    return false
  },

  toItems: async (): Promise<boolean> => {
    const initialCheck = await backendCommand.isVisible("items/lock")
    if (initialCheck) {
      return true
    }

    const result = await backendCommand.find("ui/items")
    if (result.matches.length > 0) {
      await backendCommand.click(result.matches[0])
    } else {
      console.log("Items button not found on screen")
      return false
    }

    const secondCheck = await backendCommand.isVisible("items/lock")
    if (secondCheck) {
      console.log("Items opened successfully after first attempt")
      return true
    }

    const secondResult = await backendCommand.find("ui/items")
    if (secondResult.matches.length > 0) {
      await backendCommand.click(secondResult.matches[0])
    } else {
      console.log("Items button not found on second attempt")
      return false
    }

    const finalCheck = await backendCommand.isVisible("items/lock")
    if (finalCheck) {
      console.log("Items opened successfully after second attempt")
      return true
    }

    console.error(
      "Failed to navigate to items - items/lock not visible after multiple attempts"
    )
    return false
  },
} as const
