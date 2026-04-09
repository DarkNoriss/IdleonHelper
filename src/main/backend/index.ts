// Barrel file for backend module
// Re-exports all backend functionality for cleaner imports

// Backend client exports
export {
  type ConnectionStatus,
  closeConnection,
  getConnectionStatus,
  getLastError,
  initializeBackend,
  isConnected,
  onStatusChange,
  sendCommand,
} from "./backend-client";

// Backend command exports
export { backendCommand } from "./backend-command";
// Backend config exports
export {
  backendConfig,
  ClickPreset,
  getClickOptionsFromPreset,
} from "./backend-config";
// Backend process exports
export {
  type BackendProcessInfo,
  getBackendProcess,
  isBackendRunning,
  startBackend,
  stopBackend,
} from "./backend-process";
// Backend types exports
export type {
  ClickRequest,
  ClickResponse,
  CommandRequestMap,
  CommandResponseMap,
  DragRepeatRequest,
  DragRepeatResponse,
  DragRequest,
  DragResponse,
  FindRequest,
  FindResponse,
  FindWithDebugRequest,
  FindWithDebugResponse,
  HsvColor,
  Match,
  Point,
  ReadRegionsResponse,
  Rect,
  RegionResult,
  ScreenOffset,
  WebSocketCommandMessage,
  WebSocketCommandResponse,
  WebSocketMessage,
  WebSocketResponse,
} from "./backend-types";
