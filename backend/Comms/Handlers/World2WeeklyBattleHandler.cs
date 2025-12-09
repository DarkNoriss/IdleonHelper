using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text.Json;
using IdleonHelperBackend.Worlds.World2.WeeklyBattle;
using static IdleonHelperBackend.Comms.Handlers.WsHandlerHelpers;

namespace IdleonHelperBackend.Comms.Handlers;

internal class World2WeeklyBattleHandler : BaseHandler {
  private const string MessageType = "world-2-weekly-battle-run";

  public override bool CanHandle(string messageType) {
    return messageType == MessageType;
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    switch (req.type.ToLowerInvariant()) {
      case MessageType:
        await HandleRun(ws, req);
        break;
    }
  }

  private static async Task HandleRun(WebSocket ws, WsRequest req) {
    if (!req.data.HasValue) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: "No numbers provided"
      ));
      return;
    }

    try {
      var numbers = ExtractNumbers(req.data.Value);

      if (numbers.Count == 0) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "Numbers array is empty"
        ));
        return;
      }

      var result = await WeeklyBattleRunner.RunWeeklyBattleFlow(numbers, CancellationToken.None);
      var resultJson = WsHandlerHelpers.SerializeToCamelCase(result);

      await Send(ws, new WsResponse(
        type: "data",
        source: req.source,
        data: resultJson
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "world-2-weekly-battle-run finished"
      ));
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to handle weekly battle run: {ex.Message}"
      ));
    }
  }

  private static List<int> ExtractNumbers(JsonElement data) {
    if (data.ValueKind == JsonValueKind.Array) {
      return ParseArray(data);
    }

    if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("numbers", out var numbersProperty)) {
      return numbersProperty.ValueKind == JsonValueKind.Array ? ParseArray(numbersProperty) : [];
    }

    return [];
  }

  private static List<int> ParseArray(JsonElement arrayElement) {
    var numbers = new List<int>();

    foreach (var element in arrayElement.EnumerateArray()) {
      switch (element.ValueKind) {
        case JsonValueKind.Number:
          numbers.Add(element.GetInt32());
          break;
        case JsonValueKind.String:
          if (int.TryParse(element.GetString(), out var parsed)) {
            numbers.Add(parsed);
          }
          break;
      }
    }

    return numbers;
  }
}

