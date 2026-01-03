import { join } from "path"
import { is } from "@electron-toolkit/utils"

import type { CancellationToken } from "../utils/cancellation-token"
import { sendCommand } from "./backend-client"
import { backendConfig } from "./backend-config"
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
  StopRequest,
  StopResponse,
} from "./backend-types"

const resolveImagePath = (imagePath: string): string => {
  const normalizedPath = imagePath.replace(/^[/\\]+|[/\\]+$/g, "")

  const pathWithExtension = normalizedPath.includes(".")
    ? normalizedPath
    : `${normalizedPath}.png`

  const basePath = is.dev
    ? join(process.cwd(), "resources", "assets")
    : join(process.resourcesPath, "assets")

  return join(basePath, pathWithExtension)
}

export const backendCommand = {
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
      times: options?.times ?? backendConfig.click.times,
      interval: options?.interval ?? backendConfig.click.interval,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
    }
    return sendCommand("click", request)
  },

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
      timeoutMs: options?.timeoutMs ?? backendConfig.find.timeoutMs,
      intervalMs: options?.intervalMs ?? backendConfig.find.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
      debug: options?.debug ?? false,
    }
    return sendCommand("find", request)
  },

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
      timeoutMs: backendConfig.isVisible.timeoutMs,
      intervalMs: backendConfig.find.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
      debug: false,
    }
    const response = await sendCommand("find", request)
    return response.matches.length > 0
  },

  findAndClick: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number
          intervalMs?: number
          threshold?: number
          offset?: ScreenOffset
          debug?: boolean
          clickTimes?: number
          clickInterval?: number
          clickHoldTime?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<boolean> => {
    token.throwIfCancelled()
    const findResponse = await backendCommand.findWithDebug(imagePath, options, token)
    if (findResponse.matches.length > 0) {
      await backendCommand.click(
        findResponse.matches[0],
        {
          times: options?.clickTimes,
          interval: options?.clickInterval,
          holdTime: options?.clickHoldTime,
        },
        token
      )
      return true
    }
    return false
  },

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
      timeoutMs: options?.timeoutMs ?? backendConfig.find.timeoutMs,
      intervalMs: options?.intervalMs ?? backendConfig.find.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
    }
    return sendCommand("findWithDebug", request)
  },

  drag: async (
    start: Point,
    end: Point,
    options:
      | {
          interval?: number
          stepSize?: number
          stepDelay?: number
          holdTime?: number
          instant?: boolean
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragResponse> => {
    token.throwIfCancelled()
    const request: DragRequest = {
      start,
      end,
      interval: options?.interval ?? backendConfig.click.interval,
      stepSize: options?.stepSize ?? backendConfig.drag.stepSize,
      stepDelay: options?.stepDelay ?? backendConfig.drag.stepDelay,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
      instant: options?.instant ?? false,
    }
    return sendCommand("drag", request)
  },

  dragRepeat: async (
    start: Point,
    end: Point,
    durationSeconds: number,
    options:
      | {
          stepSize?: number
          stepDelay?: number
          holdTime?: number
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragRepeatResponse> => {
    token.throwIfCancelled()
    const request: DragRepeatRequest = {
      start,
      end,
      durationSeconds,
      stepSize: options?.stepSize ?? backendConfig.drag.stepSize,
      stepDelay: options?.stepDelay ?? backendConfig.drag.stepDelay,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
    }
    return sendCommand("dragRepeat", request)
  },

  stop: async (): Promise<StopResponse> => {
    const request: StopRequest = {}
    return sendCommand("stop", request)
  },
}
