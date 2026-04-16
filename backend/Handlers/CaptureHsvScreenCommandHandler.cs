using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class CaptureHsvScreenCommandHandler
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
        JsonSerializer.Deserialize<CaptureHsvScreenRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null || request.HsvLower == null || request.HsvUpper == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing HSV color range", ct);
        return;
      }

      var hsvLower = new ImageProcessing.HsvColor(request.HsvLower.H, request.HsvLower.S, request.HsvLower.V);
      var hsvUpper = new ImageProcessing.HsvColor(request.HsvUpper.H, request.HsvUpper.S, request.HsvUpper.V);

      var savedPath = ImageProcessing.CaptureHsvScreen(hsvLower, hsvUpper, linkedCt);

      var response = new CaptureHsvScreenResponse
      {
        SavedPath = savedPath
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (OperationCanceledException)
    {
      await MessageHandler.SendError(ws, message.Id, "Operation was cancelled", ct);
    }
    catch (ArgumentException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Invalid argument: {ex.Message}", ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error capturing HSV screen: {ex.Message}", ct);
    }
  }
}
