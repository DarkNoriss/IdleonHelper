using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class ReadRegionsCommandHandler
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
        JsonSerializer.Deserialize<ReadRegionsRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null || request.Regions.Count == 0)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing or empty regions", ct);
        return;
      }

      if (request.HsvLower == null || request.HsvUpper == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing HSV color range", ct);
        return;
      }

      var regions = request.Regions.Select(r =>
        new ImageProcessing.RegionRect(r.X, r.Y, r.Width, r.Height)
      ).ToList();

      var hsvLower = new ImageProcessing.HsvColor(
        request.HsvLower.H, request.HsvLower.S, request.HsvLower.V
      );
      var hsvUpper = new ImageProcessing.HsvColor(
        request.HsvUpper.H, request.HsvUpper.S, request.HsvUpper.V
      );

      using var colorScreenshot = WindowCapture.CaptureScreenShotColor(linkedCt);

      var results = ImageProcessing.ReadRegions(
        colorScreenshot,
        regions,
        hsvLower,
        hsvUpper,
        request.Templates,
        request.Threshold ?? 0.8,
        request.Debug ?? false,
        linkedCt
      );

      var response = new ReadRegionsResponse
      {
        Results = results.Select(r => new RegionResultDto
        {
          RegionIndex = r.RegionIndex,
          Match = r.MatchedTemplate,
          Similarity = r.Similarity,
          NonZeroPixels = r.NonZeroPixels,
          DebugImagePath = r.DebugImagePath
        }).ToList()
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (OperationCanceledException)
    {
      await MessageHandler.SendError(ws, message.Id, "Operation was cancelled", ct);
    }
    catch (FileNotFoundException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Template file not found: {ex.Message}", ct);
    }
    catch (ArgumentException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Invalid argument: {ex.Message}", ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error reading regions: {ex.Message}", ct);
    }
  }
}
