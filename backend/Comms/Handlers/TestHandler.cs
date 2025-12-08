using System.Net.WebSockets;

namespace IdleonHelperBackend.Comms.Handlers;

internal class TestHandler : BaseHandler {
  public override bool CanHandle(string messageType) {
    var type = messageType.ToLowerInvariant();
    return type == "ping";
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    var type = req.type.ToLowerInvariant();

    if (type == "ping") {
      await Send(ws, new WsResponse(type: "pong", source: req.source, data: "pong"));
    }
  }
}

