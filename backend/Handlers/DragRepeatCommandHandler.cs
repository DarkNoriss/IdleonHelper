using System.Net.WebSockets;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

internal static class DragRepeatCommandHandler
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

      var dragRepeatRequest =
        JsonSerializer.Deserialize<DragRepeatRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (dragRepeatRequest == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      if (dragRepeatRequest.DurationSeconds <= 0)
      {
        await MessageHandler.SendError(ws, message.Id, "DurationSeconds must be greater than 0", ct);
        return;
      }

      if (!dragRepeatRequest.StepSize.HasValue || !dragRepeatRequest.StepDelay.HasValue || !dragRepeatRequest.HoldTime.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required fields: StepSize, StepDelay, or HoldTime", ct);
        return;
      }

      await MouseSimulator.DragRepeat(
        dragRepeatRequest.Start,
        dragRepeatRequest.End,
        dragRepeatRequest.DurationSeconds,
        ct,
        dragRepeatRequest.StepSize.Value,
        dragRepeatRequest.StepDelay.Value,
        dragRepeatRequest.HoldTime.Value
      );

      var response = new DragRepeatResponse
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
      await MessageHandler.SendError(ws, message.Id, $"Error dragging repeat: {ex.Message}", ct);
    }
  }
}
