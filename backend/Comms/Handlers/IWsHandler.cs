using System.Net.WebSockets;

namespace IdleonBotBackend.Comms.Handlers;

internal interface IWsHandler {
  bool CanHandle(string messageType);
  Task HandleAsync(WebSocket ws, WsRequest request);
}

