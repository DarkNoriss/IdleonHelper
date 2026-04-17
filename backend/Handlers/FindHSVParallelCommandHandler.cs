using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class FindHSVParallelCommandHandler
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
        JsonSerializer.Deserialize<FindHSVParallelRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request?.ImagePaths == null || request.ImagePaths.Count == 0)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing or empty imagePaths", ct);
        return;
      }

      if (request.HsvLower == null || request.HsvUpper == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing HSV color range", ct);
        return;
      }

      if (!request.Threshold.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required field: Threshold", ct);
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

      using var colorScreenshot = WindowCapture.CaptureScreenShotColor(linkedCt);
      using var mask = ImageProcessing.BuildHsvMask(colorScreenshot, hsvLower, hsvUpper);

      var matches = ImageProcessing.FindHSVParallel(
        mask,
        request.ImagePaths,
        request.Threshold.Value,
        offset,
        linkedCt
      );

      var response = new FindHSVParallelResponse
      {
        Results = matches.ToDictionary(
          kvp => kvp.Key,
          kvp => kvp.Value.Select(m => m.Point).ToList()
        )
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
      await MessageHandler.SendError(ws, message.Id, $"Error in HSV parallel find: {ex.Message}", ct);
    }
  }
}
