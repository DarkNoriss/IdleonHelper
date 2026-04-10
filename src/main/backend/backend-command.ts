import { isAbsolute, join } from "node:path";
import { is } from "@electron-toolkit/utils";

import type { CancellationToken } from "../utils/cancellation-token";
import { sendCommand } from "./backend-client";
import { backendConfig } from "./backend-config";
import type {
  ClickRequest,
  ClickResponse,
  DragRepeatRequest,
  DragRepeatResponse,
  DragRequest,
  DragResponse,
  FindParallelRequest,
  FindRequest,
  FindWithDebugRequest,
  FindWithDebugResponse,
  HsvColor,
  KeyPressRequest,
  KeyPressResponse,
  Point,
  ReadRegionsResponse,
  Rect,
  ScreenOffset,
  ScrollRequest,
  ScrollResponse,
  StopRequest,
  StopResponse,
} from "./backend-types";

const resolveImagePath = (imagePath: string): string => {
  if (isAbsolute(imagePath)) {
    return imagePath;
  }

  const normalizedPath = imagePath.replace(/^[/\\]+|[/\\]+$/g, "");

  const pathWithExtension = normalizedPath.includes(".")
    ? normalizedPath
    : `${normalizedPath}.png`;

  const basePath = is.dev
    ? join(process.cwd(), "resources", "assets")
    : join(process.resourcesPath, "assets");

  return join(basePath, pathWithExtension);
};

export const backendCommand = {
  click: async (
    point: Point,
    options:
      | {
          times?: number;
          interval?: number;
          holdTime?: number;
        }
      | undefined,
    token: CancellationToken
  ): Promise<ClickResponse> => {
    token.throwIfCancelled();
    const request: ClickRequest = {
      point,
      times: options?.times ?? backendConfig.click.times,
      interval: options?.interval ?? backendConfig.click.interval,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
    };
    return sendCommand("click", request);
  },

  find: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number;
          intervalMs?: number;
          threshold?: number;
          offset?: ScreenOffset;
          debug?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<Point[]> => {
    token.throwIfCancelled();
    const resolvedPath = resolveImagePath(imagePath);
    const request: FindRequest = {
      imagePath: resolvedPath,
      timeoutMs: options?.timeoutMs ?? backendConfig.find.timeoutMs,
      intervalMs: options?.intervalMs ?? backendConfig.find.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
      debug: options?.debug ?? false,
    };
    const response = await sendCommand("find", request);
    return response.matches;
  },

  isVisible: async (
    imagePath: string,
    options:
      | {
          offset?: ScreenOffset;
          threshold?: number;
          debug?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<Point[]> => {
    token.throwIfCancelled();
    const resolvedPath = resolveImagePath(imagePath);
    if (options?.debug) {
      const request: FindWithDebugRequest = {
        imagePath: resolvedPath,
        timeoutMs: backendConfig.isVisible.timeoutMs,
        intervalMs: backendConfig.isVisible.intervalMs,
        threshold: options?.threshold ?? backendConfig.find.threshold,
        offset: options?.offset ?? undefined,
      };
      const response = await sendCommand("findWithDebug", request);
      return response.matches.map((m) => m.point);
    }
    const request: FindRequest = {
      imagePath: resolvedPath,
      timeoutMs: backendConfig.isVisible.timeoutMs,
      intervalMs: backendConfig.isVisible.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
      debug: false,
    };
    const response = await sendCommand("find", request);
    return response.matches;
  },

  findAndClick: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number;
          intervalMs?: number;
          threshold?: number;
          offset?: ScreenOffset;
          debug?: boolean;
          clickTimes?: number;
          clickInterval?: number;
          clickHoldTime?: number;
        }
      | undefined,
    token: CancellationToken
  ): Promise<boolean> => {
    token.throwIfCancelled();
    const findResponse = await backendCommand.find(imagePath, options, token);
    if (findResponse.length > 0) {
      await backendCommand.click(
        findResponse[0]!,
        {
          times: options?.clickTimes,
          interval: options?.clickInterval,
          holdTime: options?.clickHoldTime,
        },
        token
      );
      return true;
    }
    return false;
  },

  findWithDebug: async (
    imagePath: string,
    options:
      | {
          timeoutMs?: number;
          intervalMs?: number;
          threshold?: number;
          offset?: ScreenOffset;
        }
      | undefined,
    token: CancellationToken
  ): Promise<FindWithDebugResponse> => {
    token.throwIfCancelled();
    const resolvedPath = resolveImagePath(imagePath);
    const request: FindWithDebugRequest = {
      imagePath: resolvedPath,
      timeoutMs: options?.timeoutMs ?? backendConfig.find.timeoutMs,
      intervalMs: options?.intervalMs ?? backendConfig.find.intervalMs,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
    };
    return sendCommand("findWithDebug", request);
  },

  drag: async (
    start: Point,
    end: Point,
    options:
      | {
          interval?: number;
          stepSize?: number;
          stepDelay?: number;
          holdTime?: number;
          instant?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragResponse> => {
    token.throwIfCancelled();
    const request: DragRequest = {
      start,
      end,
      interval: options?.interval ?? backendConfig.click.interval,
      stepSize: options?.stepSize ?? backendConfig.drag.stepSize,
      stepDelay: options?.stepDelay ?? backendConfig.drag.stepDelay,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
      instant: options?.instant ?? false,
    };
    return sendCommand("drag", request);
  },

  dragRepeat: async (
    start: Point,
    end: Point,
    durationSeconds: number,
    options:
      | {
          stepSize?: number;
          stepDelay?: number;
          holdTime?: number;
        }
      | undefined,
    token: CancellationToken
  ): Promise<DragRepeatResponse> => {
    token.throwIfCancelled();
    const request: DragRepeatRequest = {
      start,
      end,
      durationSeconds,
      stepSize: options?.stepSize ?? backendConfig.drag.stepSize,
      stepDelay: options?.stepDelay ?? backendConfig.drag.stepDelay,
      holdTime: options?.holdTime ?? backendConfig.click.holdTime,
    };
    return sendCommand("dragRepeat", request);
  },

  keyPress: async (
    key: number,
    options:
      | {
          holdTime?: number;
        }
      | undefined,
    token: CancellationToken
  ): Promise<KeyPressResponse> => {
    token.throwIfCancelled();
    const request: KeyPressRequest = {
      key,
      holdTime: options?.holdTime ?? 50,
    };
    return sendCommand("keyPress", request);
  },

  scroll: async (
    point: Point,
    delta: number,
    options:
      | {
          times?: number;
          interval?: number;
        }
      | undefined,
    token: CancellationToken
  ): Promise<ScrollResponse> => {
    token.throwIfCancelled();
    const request: ScrollRequest = {
      delta,
      point,
      times: options?.times ?? 1,
      interval: options?.interval ?? 100,
    };
    return sendCommand("scroll", request);
  },

  findParallel: async (
    images: Record<string, string>,
    options:
      | {
          timeoutMs?: number;
          intervalMs?: number;
          threshold?: number;
          offset?: ScreenOffset;
          debug?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<Record<string, Point[]>> => {
    token.throwIfCancelled();
    const entries = Object.entries(images);
    const resolvedPaths = entries.map(([, path]) => resolveImagePath(path));
    const timeoutMs = options?.timeoutMs ?? backendConfig.find.timeoutMs;
    const intervalMs = options?.intervalMs ?? backendConfig.find.intervalMs;
    const threshold = options?.threshold ?? backendConfig.find.threshold;
    const debug = options?.debug ?? false;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      token.throwIfCancelled();
      const request: FindParallelRequest = {
        imagePaths: resolvedPaths,
        threshold,
        offset: options?.offset ?? undefined,
        debug,
      };
      const response = await sendCommand("findParallel", request);
      const responseValues = Object.values(response.results);
      const hasMatch = responseValues.some((m) => m.length > 0);
      if (hasMatch) {
        const result: Record<string, Point[]> = {};
        for (let i = 0; i < entries.length; i++) {
          result[entries[i]![0]] = responseValues[i] ?? [];
        }
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const emptyResult: Record<string, Point[]> = {};
    for (const [key] of entries) {
      emptyResult[key] = [];
    }
    return emptyResult;
  },

  isVisibleParallel: async (
    images: Record<string, string>,
    options:
      | {
          offset?: ScreenOffset;
          threshold?: number;
          debug?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<Record<string, Point[]>> => {
    token.throwIfCancelled();
    const entries = Object.entries(images);
    const resolvedPaths = entries.map(([, path]) => resolveImagePath(path));
    const request: FindParallelRequest = {
      imagePaths: resolvedPaths,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      offset: options?.offset ?? undefined,
      debug: options?.debug ?? false,
    };
    const response = await sendCommand("findParallel", request);
    const responseValues = Object.values(response.results);
    const result: Record<string, Point[]> = {};
    for (let i = 0; i < entries.length; i++) {
      result[entries[i]![0]] = responseValues[i] ?? [];
    }
    return result;
  },

  readRegions: async (
    regions: Rect[],
    hsvLower: HsvColor,
    hsvUpper: HsvColor,
    templates: string[],
    options:
      | {
          threshold?: number;
          debug?: boolean;
        }
      | undefined,
    token: CancellationToken
  ): Promise<ReadRegionsResponse> => {
    token.throwIfCancelled();
    const resolvedTemplates = templates.map(resolveImagePath);
    return sendCommand("readRegions", {
      regions,
      hsvLower,
      hsvUpper,
      templates: resolvedTemplates,
      threshold: options?.threshold ?? backendConfig.find.threshold,
      debug: options?.debug ?? false,
    });
  },

  stop: async (): Promise<StopResponse> => {
    const request: StopRequest = {};
    return sendCommand("stop", request);
  },
};
