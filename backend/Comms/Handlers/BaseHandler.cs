using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace IdleonBotBackend.Comms.Handlers;

internal abstract class BaseHandler : IWsHandler {
  public abstract bool CanHandle(string messageType);
  public abstract Task HandleAsync(WebSocket ws, WsRequest request);

  protected static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }
}

internal static class WsHandlerHelpers {
  public static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }
}

