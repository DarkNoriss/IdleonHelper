// Barrel file for backend module
// Re-exports all backend functionality for cleaner imports

// Backend client exports
export {
  type ConnectionStatus,
  onStatusChange,
  initializeBackend,
  sendCommand,
  closeConnection,
  isConnected,
  getConnectionStatus,
  getLastError,
} from "./backend-client"

// Backend command exports
export { backendCommand } from "./backend-command"

// Backend process exports
export {
  type BackendProcessInfo,
  startBackend,
  stopBackend,
  getBackendProcess,
  isBackendRunning,
} from "./backend-process"

// Backend types exports
export type {
  Point,
  ScreenOffset,
  WebSocketMessage,
  WebSocketResponse,
  FindRequest,
  FindResponse,
  FindWithDebugRequest,
  FindWithDebugResponse,
  ClickRequest,
  ClickResponse,
  DragRequest,
  DragResponse,
  DragRepeatRequest,
  DragRepeatResponse,
  CommandRequestMap,
  CommandResponseMap,
  WebSocketCommandMessage,
  WebSocketCommandResponse,
} from "./backend-types"

// Backend config exports
export { backendConfig } from "./backend-config"
