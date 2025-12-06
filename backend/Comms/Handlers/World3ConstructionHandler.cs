using System.Net.WebSockets;
using System.Text.Json;
using IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;
using Newtonsoft.Json;
using static IdleonBotBackend.Comms.Handlers.WsHandlerHelpers;

namespace IdleonBotBackend.Comms.Handlers;

internal class World3ConstructionHandler : BaseHandler {
  public override bool CanHandle(string messageType) {
    var type = messageType.ToLowerInvariant();
    return type == "world-3-construction" ||
           type == "world-3-construction-load-json" ||
           type == "world-3-construction-optimize";
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    var type = req.type.ToLowerInvariant();

    switch (type) {
      case "world-3-construction":
        await HandleConstruction(ws, req);
        break;
      case "world-3-construction-load-json":
        await HandleLoadJson(ws, req);
        break;
      case "world-3-construction-optimize":
        await HandleOptimize(ws, req);
        break;
    }
  }

  private static async Task HandleConstruction(WebSocket ws, WsRequest req) {
    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Starting world-3 construction..."
    ));

    await Task.Delay(300);

    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "TODO: capture screen, find building, click..."
    ));

    await Task.Delay(300);

    await Send(ws, new WsResponse(
      type: "done",
      source: req.source,
      data: "world-3-construction finished"
    ));
  }

  private static async Task HandleLoadJson(WebSocket ws, WsRequest req) {
    if (!req.data.HasValue) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: "No JSON data provided"
      ));
      return;
    }

    var dataString = req.data.Value.GetRawText();

    async Task LogCallback(string message) {
      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: message
      ));
    }

    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Loading JSON data..."
    ));

    try {
      try {
        Newtonsoft.Json.Linq.JObject.Parse(dataString);
      } catch (Newtonsoft.Json.JsonException jsonEx) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: $"Invalid JSON format: {jsonEx.Message}"
        ));
        return;
      }

      var score = await BoardOptimizer.LoadJsonData(dataString, req.source, LogCallback, CancellationToken.None);
      var scoreJson = JsonConvert.SerializeObject(score, Formatting.Indented);

      await Send(ws, new WsResponse(
        type: "data",
        source: req.source,
        data: scoreJson
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "world-3-construction-load-json finished"
      ));
    } catch (Exception ex) {
      Console.WriteLine($"[WS] Load JSON error: {ex.Message}");
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to load JSON: {ex.Message}"
      ));
    }
  }

  private static async Task HandleOptimize(WebSocket ws, WsRequest req) {
    if (!req.data.HasValue) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: "No optimization parameters provided"
      ));
      return;
    }

    try {
      var dataString = req.data.Value.GetRawText();
      var dataObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataString);
      
      if (!dataObj.TryGetProperty("timeInSeconds", out var timeProperty)) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "timeInSeconds parameter is required"
        ));
        return;
      }

      var timeInSeconds = timeProperty.GetInt32();
      
      if (timeInSeconds <= 0) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "timeInSeconds must be greater than 0"
        ));
        return;
      }

      async Task LogCallback(string message) {
        await Send(ws, new WsResponse(
          type: "log",
          source: req.source,
          data: message
        ));
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: $"Starting optimization for {timeInSeconds} seconds..."
      ));

      var result = await BoardOptimizer.Optimize(req.source, timeInSeconds, LogCallback, CancellationToken.None);
      var resultJson = JsonConvert.SerializeObject(result, Formatting.Indented);

      await Send(ws, new WsResponse(
        type: "data",
        source: req.source,
        data: resultJson
      ));

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: $"Optimization completed. Score improvement: {result.DifferencePercent}%"
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "world-3-construction-optimize finished"
      ));
    } catch (Exception ex) {
      Console.WriteLine($"[WS] Optimize error: {ex.Message}");
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to optimize: {ex.Message}"
      ));
    }
  }
}

