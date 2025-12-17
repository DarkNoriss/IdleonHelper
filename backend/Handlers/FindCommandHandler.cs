using System.Net.WebSockets;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

internal static class FindCommandHandler
{
  public static async Task Handle(WebSocket ws, WebSocketMessage message, CancellationToken ct)
  {
    try
    {
      if (!message.Data.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing data field", ct);
        return;
      }

      var findRequest =
        JsonSerializer.Deserialize<FindRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (findRequest == null || string.IsNullOrWhiteSpace(findRequest.ImagePath))
      {
        await MessageHandler.SendError(ws, message.Id, "Missing or invalid imagePath", ct);
        return;
      }

      var offset = findRequest.Offset != null
        ? new ImageProcessing.ScreenOffset(
          findRequest.Offset.Left,
          findRequest.Offset.Right,
          findRequest.Offset.Top,
          findRequest.Offset.Bottom
        )
        : null;

      var matches = await ImageProcessing.Find(
        findRequest.ImagePath,
        ct,
        findRequest.TimeoutMs ?? ImageProcessing.DefaultImageTimeoutMs,
        findRequest.IntervalMs ?? ImageProcessing.DefaultImageIntervalMs,
        findRequest.Threshold ?? ImageProcessing.DefaultImageThreshold,
        offset,
        findRequest.Debug ?? false
      );

      var response = new FindResponse
      {
        Matches = matches
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
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
