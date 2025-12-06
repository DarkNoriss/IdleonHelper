using System.Net.WebSockets;
using IdleonBotBackend.Utils;
using static IdleonBotBackend.Comms.Handlers.WsHandlerHelpers;

namespace IdleonBotBackend.Comms.Handlers;

internal class TestHandler : BaseHandler {
  public override bool CanHandle(string messageType) {
    return messageType.ToLowerInvariant() == "test-capture-screenshot";
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Capturing screenshot..."
    ));

    try {
      WindowCapture.CaptureAndDisplay(CancellationToken.None);

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Screenshot captured and displayed"
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "test-capture-screenshot finished"
      ));
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to capture screenshot: {ex.Message}"
      ));
    }
  }
}

