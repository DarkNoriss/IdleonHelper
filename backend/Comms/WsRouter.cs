using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using IdleonBotBackend.Utils;
using IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;
using Newtonsoft.Json;

namespace IdleonBotBackend.Comms;

internal static class WsRouter {
  private static readonly JsonSerializerOptions JsonOptions = new() {
    PropertyNameCaseInsensitive = true
  };

  public static async Task HandleMessageAsync(WebSocket ws, string json) {
    WsRequest? req;
    try {
      req = System.Text.Json.JsonSerializer.Deserialize<WsRequest>(json, JsonOptions);
    } catch (Exception ex) {
      // Log minimal info for large JSON files
      var preview = json.Length > 150 ? json.Substring(0, 150) : json;
      var suffix = json.Length > 150 ? json.Substring(Math.Max(0, json.Length - 50)) : "";
      Console.WriteLine($"[WS] Invalid JSON (length: {json.Length}): {ex.Message}");
      Console.WriteLine($"[WS] Start: {preview}...");
      if (suffix.Length > 0) {
        Console.WriteLine($"[WS] End: ...{suffix}");
      }
      return;
    }

    if (req is null || string.IsNullOrWhiteSpace(req.type) || string.IsNullOrWhiteSpace(req.source)) {
      Console.WriteLine("[WS] invalid payload (missing type/source)");
      return;
    }

    switch (req.type.ToLowerInvariant()) {
      case "ping":
        await Send(ws, new WsResponse(
          type: "pong",
          source: req.source,
          data: "pong"
        ));
        break;

      case "test-capture-screenshot":
        await HandleTestCaptureScreenshot(ws, req);
        break;

      case "world-3-construction":
        await HandleWorld3Construction(ws, req);
        break;

      case "world-3-construction-load-json":
        await HandleWorld3ConstructionLoadJson(ws, req);
        break;

      case "world-3-construction-optimize":
        await HandleWorld3ConstructionOptimize(ws, req);
        break;

      default:
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: $"unknown type '{req.type}'"
        ));
        break;
    }
  }

  private static async Task HandleTestCaptureScreenshot(WebSocket ws, WsRequest req) {
    Console.WriteLine("[WS] test-capture-screenshot start");

    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Capturing screenshot..."
    ));

    try {
      var ct = CancellationToken.None;
      WindowCapture.CaptureAndDisplay(ct);

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

    Console.WriteLine("[WS] test-capture-screenshot done");
  }

  private static async Task HandleWorld3Construction(WebSocket ws, WsRequest req) {
    Console.WriteLine("[WS] world-3-construction start");

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

    Console.WriteLine("[WS] world-3-construction done");
  }

  private static async Task HandleWorld3ConstructionLoadJson(WebSocket ws, WsRequest req) {
    Console.WriteLine("[WS] world-3-construction-load-json start");

    if (!req.data.HasValue) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: "No JSON data provided"
      ));
      return;
    }

    // Convert JsonElement to string for processing
    var dataString = req.data.Value.GetRawText();

    // Log callback for BoardOptimizer
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
      // Validate JSON before processing with Newtonsoft.Json (since that's what LoadJsonData uses)
      try {
        var testParse = Newtonsoft.Json.Linq.JObject.Parse(dataString);
        Console.WriteLine("[WS] JSON validation passed");
      } catch (Newtonsoft.Json.JsonException jsonEx) {
        Console.WriteLine($"[WS] JSON validation failed: {jsonEx.Message}");
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: $"Invalid JSON format: {jsonEx.Message}"
        ));
        return;
      }

      var ct = CancellationToken.None;
      var score = await BoardOptimizer.LoadJsonData(dataString, req.source, LogCallback, ct);

      // Serialize score to JSON
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

      Console.WriteLine("[WS] world-3-construction-load-json done");
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to load JSON: {ex.Message}"
      ));
      Console.WriteLine($"[WS] world-3-construction-load-json error: {ex.Message}");
    }
  }

  private static async Task HandleWorld3ConstructionOptimize(WebSocket ws, WsRequest req) {
    Console.WriteLine("[WS] world-3-construction-optimize start");

    if (!req.data.HasValue) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: "No optimization parameters provided"
      ));
      return;
    }

    try {
      // Parse the data to get timeInSeconds
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

      // Log callback for BoardOptimizer
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

      var ct = CancellationToken.None;
      var result = await BoardOptimizer.Optimize(req.source, timeInSeconds, LogCallback, ct);

      // Send optimization result with comparison
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

      Console.WriteLine("[WS] world-3-construction-optimize done");
    } catch (Exception ex) {
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to optimize: {ex.Message}"
      ));
      Console.WriteLine($"[WS] world-3-construction-optimize error: {ex.Message}");
    }
  }

  private static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }
}
