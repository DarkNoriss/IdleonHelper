using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using IdleonBotBackend.Comms.Handlers;

namespace IdleonBotBackend.Comms;

internal static class WsRouter {
  private static readonly JsonSerializerOptions JsonOptions = new() {
    PropertyNameCaseInsensitive = true
  };

  private static readonly IWsHandler[] Handlers = [
    new TestHandler(),
    new World3ConstructionHandler()
  ];

  public static async Task HandleMessageAsync(WebSocket ws, string json) {
    WsRequest? req;
    try {
      req = System.Text.Json.JsonSerializer.Deserialize<WsRequest>(json, JsonOptions);
    } catch (Exception ex) {
      Console.WriteLine($"[WS] Invalid JSON: {ex.Message}");
      return;
    }

    if (req is null || string.IsNullOrWhiteSpace(req.type) || string.IsNullOrWhiteSpace(req.source)) {
      return;
    }

    var messageType = req.type.ToLowerInvariant();

    var handler = Handlers.FirstOrDefault(h => h.CanHandle(messageType));
    if (handler != null) {
      try {
        await handler.HandleAsync(ws, req);
      } catch (Exception ex) {
        Console.WriteLine($"[WS] Handler error ({req.type}): {ex.Message}");
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: $"Handler error: {ex.Message}"
        ));
      }
      return;
    }

    await Send(ws, new WsResponse(
      type: "error",
      source: req.source,
      data: $"Unknown message type: '{req.type}'"
    ));
  }

  private static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }
}
