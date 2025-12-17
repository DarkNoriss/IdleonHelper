using System.Net.WebSockets;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

internal static class ClickCommandHandler
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

      var clickRequest =
        JsonSerializer.Deserialize<ClickRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (clickRequest == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      await MouseSimulator.Click(
        clickRequest.Point,
        ct,
        clickRequest.Times ?? 1,
        clickRequest.Interval ?? MouseSimulator.MouseClickDelay,
        clickRequest.HoldTime ?? MouseSimulator.MouseClickHold
      );

      var response = new ClickResponse
      {
        Success = true
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (ArgumentException ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Invalid argument: {ex.Message}", ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error clicking: {ex.Message}", ct);
    }
  }
}
