import type { HsvColor } from "@/types/hsv";

export type { HsvColor } from "@/types/hsv";

// Base types
export type Point = {
  x: number;
  y: number;
};

export type ScreenOffset = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

// WebSocket message structure
export type WebSocketMessage = {
  id?: string;
  command: string;
  data?: unknown;
};

// WebSocket response structure
// Note: Backend sends lowercase (id, type, data, error) in responses
export type WebSocketResponse<T = unknown> = {
  id?: string;
  type: "response" | "error";
  data?: T;
  error?: string;
};

// Find command
export type FindRequest = {
  imagePath: string;
  timeoutMs?: number;
  intervalMs?: number;
  threshold?: number;
  offset?: ScreenOffset;
  debug?: boolean;
};

export type FindResponse = {
  matches: Point[];
};

// Find with debug command
export type FindWithDebugRequest = {
  imagePath: string;
  timeoutMs?: number;
  intervalMs?: number;
  threshold?: number;
  offset?: ScreenOffset;
};

export type Match = {
  point: Point;
  similarity: number;
};

export type FindWithDebugResponse = {
  matches: Match[];
  debugImagePath?: string | null;
};

// Find parallel command
export type FindParallelRequest = {
  imagePaths: string[];
  threshold: number;
  offset?: ScreenOffset;
  debug?: boolean;
};

export type FindParallelResponse = {
  results: Record<string, Point[]>;
  debugImagePaths?: Record<string, string | null>;
};

// Click command
export type ClickRequest = {
  point: Point;
  times?: number;
  interval?: number;
  holdTime?: number;
};

export type ClickResponse = {
  success: boolean;
};

// Drag command
export type DragRequest = {
  start: Point;
  end: Point;
  interval?: number;
  stepSize?: number;
  stepDelay?: number;
  holdTime?: number;
  instant?: boolean;
};

export type DragResponse = {
  success: boolean;
};

// Drag repeat command
export type DragRepeatRequest = {
  start: Point;
  end: Point;
  durationSeconds: number;
  stepSize?: number;
  stepDelay?: number;
  holdTime?: number;
};

export type DragRepeatResponse = {
  success: boolean;
};

// Stop command
export type StopRequest = Record<string, never>;

export type StopResponse = {
  success: boolean;
};

// KeyPress command
export type KeyPressRequest = {
  key: number;
  holdTime?: number;
};

export type KeyPressResponse = {
  success: boolean;
};

// Scroll command
export type ScrollRequest = {
  delta: number;
  point: Point;
  times?: number;
  interval?: number;
};

export type ScrollResponse = {
  success: boolean;
};

// ReadRegions command
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RegionResult = {
  regionIndex: number;
  match: string | null;
  similarity: number;
  nonZeroPixels: number;
  debugImagePath: string | null;
};

export type ReadRegionsRequest = {
  regions: Rect[];
  hsvLower: HsvColor;
  hsvUpper: HsvColor;
  templates: string[];
  threshold?: number;
  debug?: boolean;
};

export type ReadRegionsResponse = {
  results: RegionResult[];
};

// CaptureHsvScreen command
export type CaptureHsvScreenRequest = {
  hsvLower: HsvColor;
  hsvUpper: HsvColor;
};

export type CaptureHsvScreenResponse = {
  savedPath: string;
};

// FindHSV command
export type FindHSVRequest = {
  imagePath: string;
  hsvLower: HsvColor;
  hsvUpper: HsvColor;
  timeoutMs?: number;
  intervalMs?: number;
  threshold?: number;
  offset?: ScreenOffset;
};

export type FindHSVResponse = {
  matches: Point[];
};

// FindHSVParallel command
export type FindHSVParallelRequest = {
  imagePaths: string[];
  hsvLower: HsvColor;
  hsvUpper: HsvColor;
  threshold: number;
  offset?: ScreenOffset;
};

export type FindHSVParallelResponse = {
  results: Record<string, Point[]>;
};

// DragPath command
export type DragPathRequest = {
  points: Point[];
  stepSize?: number;
  stepDelay?: number;
  holdTime?: number;
};

export type DragPathResponse = {
  success: boolean;
};

// Command type mapping for type safety
export type CommandRequestMap = {
  find: FindRequest;
  findWithDebug: FindWithDebugRequest;
  click: ClickRequest;
  drag: DragRequest;
  dragRepeat: DragRepeatRequest;
  dragPath: DragPathRequest;
  stop: StopRequest;
  keyPress: KeyPressRequest;
  scroll: ScrollRequest;
  findParallel: FindParallelRequest;
  readRegions: ReadRegionsRequest;
  captureHsvScreen: CaptureHsvScreenRequest;
  findHSV: FindHSVRequest;
  findHSVParallel: FindHSVParallelRequest;
};

export type CommandResponseMap = {
  find: FindResponse;
  findWithDebug: FindWithDebugResponse;
  click: ClickResponse;
  drag: DragResponse;
  dragRepeat: DragRepeatResponse;
  dragPath: DragPathResponse;
  stop: StopResponse;
  keyPress: KeyPressResponse;
  scroll: ScrollResponse;
  findParallel: FindParallelResponse;
  readRegions: ReadRegionsResponse;
  captureHsvScreen: CaptureHsvScreenResponse;
  findHSV: FindHSVResponse;
  findHSVParallel: FindHSVParallelResponse;
};

// Helper type for creating type-safe WebSocket messages
// Note: Backend expects PascalCase (Id, Command, Data) due to case-sensitive deserialization
export type WebSocketCommandMessage<T extends keyof CommandRequestMap> = {
  Id?: string;
  Command: T;
  Data: CommandRequestMap[T];
};

// Helper type for type-safe responses
export type WebSocketCommandResponse<T extends keyof CommandResponseMap> =
  WebSocketResponse<CommandResponseMap[T]>;
