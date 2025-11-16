import { ipcMain } from "electron"

interface JsonPayload {
  data: {
    cogM: unknown
  }
}

export function registerWorld3ConstructionHandlers(): void {
  ipcMain.handle(
    "world-3-construction:process-json",
    (_event, jsonString: string) => {
      try {
        const parsed: JsonPayload = JSON.parse(jsonString)

        if (!parsed.data) {
          return {
            success: false,
            error: "JSON does not contain 'data' property",
          }
        }

        if (parsed.data.cogM === undefined) {
          return {
            success: false,
            error: "data does not contain 'cogM' property",
          }
        }

        return {
          success: true,
          data: parsed.data.cogM,
        }
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to parse JSON",
        }
      }
    }
  )
}
