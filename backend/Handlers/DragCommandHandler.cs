using System.Net.WebSockets;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

internal static class DragCommandHandler
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

      var dragRequest =
        JsonSerializer.Deserialize<DragRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (dragRequest == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      await MouseSimulator.Drag(
        dragRequest.Start,
        dragRequest.End,
        ct,
        dragRequest.Interval ?? MouseSimulator.MouseClickDelay,
        dragRequest.StepSize ?? 3
      );

      var response = new DragResponse
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
      await MessageHandler.SendError(ws, message.Id, $"Error dragging: {ex.Message}", ct);
    }
  }
}
