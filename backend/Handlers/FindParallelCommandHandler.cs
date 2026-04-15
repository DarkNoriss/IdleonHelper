using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class FindParallelCommandHandler
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
        JsonSerializer.Deserialize<FindParallelRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request?.ImagePaths == null || request.ImagePaths.Count == 0)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing or empty imagePaths", ct);
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

      var debug = request.Debug ?? false;

      using var screenshot = WindowCapture.CaptureScreenShot(linkedCt);

      var matches = ImageProcessing.FindParallel(
        screenshot,
        request.ImagePaths,
        request.Threshold.Value,
        offset,
        debug,
        linkedCt
      );

      var response = new FindParallelResponse
      {
        Results = matches.ToDictionary(
          kvp => kvp.Key,
          kvp => kvp.Value.Select(m => m.Point).ToList()
        )
      };

      if (debug)
      {
        response.DebugImagePaths = ImageProcessing.GenerateDebugImages(
          screenshot, matches, request.ImagePaths, linkedCt
        );
      }

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
      await MessageHandler.SendError(ws, message.Id, $"Error in parallel find: {ex.Message}", ct);
    }
  }
}
