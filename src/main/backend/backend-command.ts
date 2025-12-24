import { join } from "path"
import { is } from "@electron-toolkit/utils"

import type { CancellationToken } from "../utils/cancellation-token"
import { sendCommand } from "./backend-client"
import type {
  ClickRequest,
  ClickResponse,
  DragRepeatRequest,
  DragRepeatResponse,
  DragRequest,
  DragResponse,
  FindRequest,
  FindResponse,
  FindWithDebugRequest,
  FindWithDebugResponse,
  Point,
  ScreenOffset,
} from "./backend-types"

/**
 * Resolves an image path relative to resources/assets
 * Automatically prepends resources/assets/ and adds .png extension if missing
 * @param imagePath - Relative image path (e.g., "ui/codex" or "ui/codex.png")
 * @returns Full absolute path to the image
 */
const resolveImagePath = (imagePath: string): string => {
  // Remove leading/trailing slashes and normalize
  const normalizedPath = imagePath.replace(/^[/\\]+|[/\\]+$/g, "")

  // Add .png extension if it doesn't already have an extension
  const pathWithExtension = normalizedPath.includes(".")
    ? normalizedPath
    : `${normalizedPath}.png`

  // Get base path (dev vs production)
  const basePath = is.dev
    ? join(process.cwd(), "resources", "assets")
    : join(process.resourcesPath, "assets")

  return join(basePath, pathWithExtension)
}

/**
 * Helper functions for backend commands
 * Provides easy-to-use wrappers around WebSocket commands
 */
export const backendCommand = {
  /**
   * Click at a specific point on the screen
   * @param point - Point coordinates { x, y }
   * @param options - Optional click parameters
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to click response
   * @example
   * await backendCommand.click({ x: 100, y: 200 }, undefined, token)
   * await backendCommand.click({ x: 100, y: 200 }, { times: 2, interval: 100 }, token)
   */
  click: async (
    point: Point,
    options:
      | {
          times?: number
          interval?: number
          holdTime?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<ClickResponse> => {
    token.throwIfCancelled()
    const request: ClickRequest = {
      point,
      ...options,
    }
    return sendCommand("click", request)
  },

  /**
   * Find an image on the screen
   * @param imagePath - Relative path to the image file (e.g., "ui/codex" or "ui/codex.png")
   *                    Automatically resolves to resources/assets/ and adds .png if missing
   * @param options - Optional search parameters
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to find response with matches
   * @example
   * const result = await backendCommand.find("ui/codex", undefined, token)
   * const matches = result.matches
   */
  find: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number
          intervalMs?: number
          threshold?: number
          offset?: ScreenOffset
          debug?: boolean
        }
      | undefined,
    token: CancellationToken
  ): Promise<FindResponse> => {
    token.throwIfCancelled()
    const resolvedPath = resolveImagePath(imagePath)
    const request: FindRequest = {
      imagePath: resolvedPath,
      ...options,
    }
    return sendCommand("find", request)
  },

  /**
   * Check if an image is currently visible on screen (quick check with 100ms timeout)
   * @param imagePath - Relative path to the image file (e.g., "ui/codex" or "ui/codex.png")
   *                    Automatically resolves to resources/assets/ and adds .png if missing
   * @param options - Optional search parameters (offset and threshold)
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to boolean indicating if image is visible
   * @example
   * const visible = await backendCommand.isVisible("ui/codex", undefined, token)
   * if (visible) console.log("Codex is visible")
   */
  isVisible: async (
    imagePath: string,
    options:
      | {
          offset?: ScreenOffset
          threshold?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<boolean> => {
    token.throwIfCancelled()
    const resolvedPath = resolveImagePath(imagePath)
    const request: FindRequest = {
      imagePath: resolvedPath,
      timeoutMs: 100,
      ...options,
    }
    const response = await sendCommand("find", request)
    return response.matches.length > 0
  },

  /**
   * Find an image on the screen with debug output
   * @param imagePath - Relative path to the image file (e.g., "ui/codex" or "ui/codex.png")
   *                    Automatically resolves to resources/assets/ and adds .png if missing
   * @param options - Optional search parameters
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to find response with matches and debug image path
   * @example
   * const result = await backendCommand.findWithDebug("ui/codex", undefined, token)
   * console.log(result.debugImagePath)
   */
  findWithDebug: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number
          intervalMs?: number
          threshold?: number
          offset?: ScreenOffset
        }
      | undefined,
    token: CancellationToken
  ): Promise<FindWithDebugResponse> => {
    token.throwIfCancelled()
    const resolvedPath = resolveImagePath(imagePath)
    const request: FindWithDebugRequest = {
      imagePath: resolvedPath,
      ...options,
    }
    return sendCommand("findWithDebug", request)
  },

  /**
   * Drag from one point to another
   * @param start - Starting point { x, y }
   * @param end - Ending point { x, y }
   * @param options - Optional drag parameters
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to drag response
   * @example
   * await backendCommand.drag({ x: 100, y: 100 }, { x: 200, y: 200 }, undefined, token)
   * await backendCommand.drag({ x: 100, y: 100 }, { x: 200, y: 200 }, { interval: 10, stepSize: 5 }, token)
   */
  drag: async (
    start: Point,
    end: Point,
    options:
      | {
          interval?: number
          stepSize?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragResponse> => {
    token.throwIfCancelled()
    const request: DragRequest = {
      start,
      end,
      ...options,
    }
    return sendCommand("drag", request)
  },

  /**
   * Drag from one point to another repeatedly for a duration
   * @param start - Starting point { x, y }
   * @param end - Ending point { x, y }
   * @param durationSeconds - Duration in seconds to repeat the drag
   * @param options - Optional drag parameters
   * @param token - Cancellation token for operation cancellation
   * @returns Promise resolving to drag repeat response
   * @example
   * await backendCommand.dragRepeat({ x: 100, y: 100 }, { x: 200, y: 200 }, 5, undefined, token)
   * await backendCommand.dragRepeat({ x: 100, y: 100 }, { x: 200, y: 200 }, 5, { stepSize: 5 }, token)
   */
  dragRepeat: async (
    start: Point,
    end: Point,
    durationSeconds: number,
    options:
      | {
          stepSize?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragRepeatResponse> => {
    token.throwIfCancelled()
    const request: DragRepeatRequest = {
      start,
      end,
      durationSeconds,
      ...options,
    }
    return sendCommand("dragRepeat", request)
  },
}
