using System.Net.WebSockets;
using System.Collections.Concurrent;
using IdleonHelperBackend.Worlds.General;

namespace IdleonHelperBackend.Comms.Handlers;

internal class GeneralHandler : BaseHandler {
  private const string CANDY_MESSAGE_TYPE = "general-candy-start";
  private const string CANDY_CANCEL_MESSAGE_TYPE = "general-candy-stop";
  private static readonly ConcurrentDictionary<string, CancellationTokenSource> ActiveRuns = new();

  public override bool CanHandle(string messageType) {
    return messageType is CANDY_MESSAGE_TYPE or CANDY_CANCEL_MESSAGE_TYPE;
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    Console.WriteLine(
      $"[General] Received request type='{req.type}' source='{req.source}' data='{req.data?.GetRawText()}'");

    switch (req.type.ToLowerInvariant()) {
      case CANDY_MESSAGE_TYPE:
        await HandleCandyStart(ws, req);
        break;
      case CANDY_CANCEL_MESSAGE_TYPE:
        await HandleCancel(ws, req);
        break;
    }
  }

  private static Task HandleCandyStart(WebSocket ws, WsRequest req) {
    CancelAndRemoveExisting(req.source);

    var cts = new CancellationTokenSource();
    ActiveRuns[req.source] = cts;
    Console.WriteLine($"[General] Stored CTS for source '{req.source}'");

    _ = Task.Run(async () => {
      try {
        Console.WriteLine($"[General] Starting candy automation for source '{req.source}'");
        var result = await Candy.StartAsync(cts.Token);
        var resultJson = WsHandlerHelpers.SerializeToCamelCase(result);

        await Send(ws, new WsResponse(
          type: "data",
          source: req.source,
          data: resultJson
        ));

        await Send(ws, new WsResponse(
          type: "done",
          source: req.source,
          data: "general-candy-start finished"
        ));

        Console.WriteLine($"[General] Candy automation completed for source '{req.source}'");
      }
      catch (OperationCanceledException) {
        Console.WriteLine($"[General] Candy automation cancelled for source '{req.source}'");
        await Send(ws, new WsResponse(
          type: "done",
          source: req.source,
          data: "general-candy cancelled"
        ));
      }
      catch (Exception ex) {
        Console.WriteLine($"[General] Candy automation error for source '{req.source}': {ex.Message}");
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: $"Failed to start candy automation: {ex.Message}"
        ));
      }
      finally {
        ActiveRuns.TryRemove(req.source, out _);
        cts.Dispose();
        Console.WriteLine($"[General] Cleaned CTS for source '{req.source}'");
      }
    }, cts.Token);

    return Task.CompletedTask;
  }

  private static async Task HandleCancel(WebSocket ws, WsRequest req) {
    var cancelled = CancelExisting(req.source);

    Console.WriteLine($"[General] Cancel request for source '{req.source}', cancelled={cancelled}");

    await Send(ws, new WsResponse(
      type: cancelled ? "done" : "error",
      source: req.source,
      data: cancelled ? "general-candy cancelled" : "No active candy run to cancel"
    ));
  }

  private static bool CancelExisting(string source) {
    if (ActiveRuns.TryGetValue(source, out var existingCts)) {
      Console.WriteLine($"[General] Cancelling existing run for source '{source}'");
      existingCts.Cancel();
      return true;
    }

    Console.WriteLine($"[General] No active run found for source '{source}' to cancel");
    return false;
  }

  private static void CancelAndRemoveExisting(string source) {
    if (!ActiveRuns.TryRemove(source, out var existingCts)) return;
    Console.WriteLine($"[General] Cancelling and removing existing run for source '{source}'");
    try {
      existingCts.Cancel();
    }
    finally {
      existingCts.Dispose();
    }
  }
}
