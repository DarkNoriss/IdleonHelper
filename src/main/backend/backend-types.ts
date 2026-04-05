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
  times?: number;
  interval?: number;
};

export type ScrollResponse = {
  success: boolean;
};

// Command type mapping for type safety
export type CommandRequestMap = {
  find: FindRequest;
  findWithDebug: FindWithDebugRequest;
  click: ClickRequest;
  drag: DragRequest;
  dragRepeat: DragRepeatRequest;
  stop: StopRequest;
  keyPress: KeyPressRequest;
  scroll: ScrollRequest;
};

export type CommandResponseMap = {
  find: FindResponse;
  findWithDebug: FindWithDebugResponse;
  click: ClickResponse;
  drag: DragResponse;
  dragRepeat: DragRepeatResponse;
  stop: StopResponse;
  keyPress: KeyPressResponse;
  scroll: ScrollResponse;
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
