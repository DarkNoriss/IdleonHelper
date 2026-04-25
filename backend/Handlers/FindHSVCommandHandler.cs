using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class FindHSVCommandHandler
{
  public static async Task Handle(WebSocket ws, WebSocketMessage message, CancellationToken ct)
  {
    try
    {
      var linkedCt = OperationCancellationManager.GetToken(ct);

      if (!message.Data.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing data field", ct);
        return;
      }

      var request =
        JsonSerializer.Deserialize<FindHSVRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null || string.IsNullOrWhiteSpace(request.ImagePath))
      {
        await MessageHandler.SendError(ws, message.Id, "Missing or invalid imagePath", ct);
        return;
      }

      if (request.HsvLower == null || request.HsvUpper == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing HSV color range", ct);
        return;
      }

      if (!request.TimeoutMs.HasValue || !request.IntervalMs.HasValue || !request.Threshold.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required fields: TimeoutMs, IntervalMs, or Threshold", ct);
        return;
      }

      var offset = request.Offset != null
        ? new ImageProcessing.ScreenOffset(
          request.Offset.Left,
          request.Offset.Right,
          request.Offset.Top,
          request.Offset.Bottom
        )
        : null;

      var hsvLower = new ImageProcessing.HsvColor(request.HsvLower.H, request.HsvLower.S, request.HsvLower.V);
      var hsvUpper = new ImageProcessing.HsvColor(request.HsvUpper.H, request.HsvUpper.S, request.HsvUpper.V);

      var matches = await ImageProcessing.FindHSV(
        request.ImagePath,
        hsvLower,
        hsvUpper,
        linkedCt,
        request.TimeoutMs.Value,
        request.IntervalMs.Value,
        request.Threshold.Value,
        offset
      );

      var debug = request.Debug ?? false;
      var response = new FindHSVResponse
      {
        Matches = matches.Select(m => m.Point).ToList(),
        Similarities = debug ? matches.Select(m => m.Similarity).ToList() : null
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (OperationCanceledException)
    {
      await MessageHandler.SendError(ws, message.Id, "Operation was cancelled", ct);
    }
    catch (FileNotFoundException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Image file not found: {ex.Message}", ct);
    }
    catch (ArgumentException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Invalid argument: {ex.Message}", ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error finding image: {ex.Message}", ct);
    }
  }
}
