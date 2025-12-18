// Base types
export type Point = {
  x: number
  y: number
}

export type ScreenOffset = {
  left: number
  right: number
  top: number
  bottom: number
}

// WebSocket message structure
export type WebSocketMessage = {
  id?: string
  command: string
  data?: unknown
}

// WebSocket response structure
// Note: Backend sends lowercase (id, type, data, error) in responses
export type WebSocketResponse<T = unknown> = {
  id?: string
  type: "response" | "error"
  data?: T
  error?: string
}

// Find command
export type FindRequest = {
  imagePath: string
  timeoutMs?: number
  intervalMs?: number
  threshold?: number
  offset?: ScreenOffset
  debug?: boolean
}

export type FindResponse = {
  matches: Point[]
}

// Find with debug command
export type FindWithDebugRequest = {
  imagePath: string
  timeoutMs?: number
  intervalMs?: number
  threshold?: number
  offset?: ScreenOffset
}

export type FindWithDebugResponse = {
  matches: Point[]
  debugImagePath?: string | null
}

// Click command
export type ClickRequest = {
  point: Point
  times?: number
  interval?: number
  holdTime?: number
}

export type ClickResponse = {
  success: boolean
}

// Drag command
export type DragRequest = {
  start: Point
  end: Point
  interval?: number
  stepSize?: number
}

export type DragResponse = {
  success: boolean
}

// Drag repeat command
export type DragRepeatRequest = {
  start: Point
  end: Point
  durationSeconds: number
  stepSize?: number
}

export type DragRepeatResponse = {
  success: boolean
}

// Command type mapping for type safety
export type CommandRequestMap = {
  find: FindRequest
  findWithDebug: FindWithDebugRequest
  click: ClickRequest
  drag: DragRequest
  dragRepeat: DragRepeatRequest
}

export type CommandResponseMap = {
  find: FindResponse
  findWithDebug: FindWithDebugResponse
  click: ClickResponse
  drag: DragResponse
  dragRepeat: DragRepeatResponse
}

// Helper type for creating type-safe WebSocket messages
// Note: Backend expects PascalCase (Id, Command, Data) due to case-sensitive deserialization
export type WebSocketCommandMessage<T extends keyof CommandRequestMap> = {
  Id?: string
  Command: T
  Data: CommandRequestMap[T]
}

// Helper type for type-safe responses
export type WebSocketCommandResponse<T extends keyof CommandResponseMap> =
  WebSocketResponse<CommandResponseMap[T]>
