using System.Net.WebSockets;
using System.Text.Json;
using IdleonBotBackend.Utils;
using IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;
using static IdleonBotBackend.Comms.Handlers.WsHandlerHelpers;

namespace IdleonBotBackend.Comms.Handlers;

internal class World3ConstructionHandler : BaseHandler {
  public override bool CanHandle(string messageType) {
    var type = messageType.ToLowerInvariant();
    return type == "world-3-construction-load-json" ||
           type == "world-3-construction-optimize" ||
           type == "world-3-construction-apply-board";
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    var type = req.type.ToLowerInvariant();

    switch (type) {
      case "world-3-construction-load-json":
        await HandleLoadJson(ws, req);
        break;
      case "world-3-construction-optimize":
        await HandleOptimize(ws, req);
        break;
      case "world-3-construction-apply-board":
        await HandleApplyBoard(ws, req);
        break;
    }
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

      var score = await BoardOptimizer.LoadJsonData(dataString, req.source, CancellationToken.None);
      var scoreJson = WsHandlerHelpers.SerializeToCamelCase(score);

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

      var result = await BoardOptimizer.Optimize(req.source, timeInSeconds, CancellationToken.None);
      
      // Convert OptimizationResult to ScoreCardData format
      var scoreCardData = new ScoreCardData {
        BuildRate = result.Before.BuildRate,
        ExpBonus = result.Before.ExpBonus,
        Flaggy = result.Before.Flaggy,
        AfterBuildRate = result.After.BuildRate,
        AfterExpBonus = result.After.ExpBonus,
        AfterFlaggy = result.After.Flaggy,
        BuildRateDiff = result.BuildRateDiff,
        ExpBonusDiff = result.ExpBonusDiff,
        FlaggyDiff = result.FlaggyDiff
      };
      
      var resultJson = WsHandlerHelpers.SerializeToCamelCase(scoreCardData);

      await Send(ws, new WsResponse(
        type: "data",
        source: req.source,
        data: resultJson
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "world-3-construction-optimize finished"
      ));
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to optimize: {ex.Message}"
      )      );
    }
  }

  private static async Task HandleApplyBoard(WebSocket ws, WsRequest req) {
    try {
      using var cts = new CancellationTokenSource();
      var ct = cts.Token;

      bool success = await BoardApplier.ApplyBoard(req.source, ct);

      if (success) {
        await Send(ws, new WsResponse(
          type: "done",
          source: req.source,
          data: "world-3-construction-apply-board finished"
        ));
      } else {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "Failed to apply board. Please check the logs for details."
        ));
      }
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to apply board: {ex.Message}"
      ));
    }
  }
}

