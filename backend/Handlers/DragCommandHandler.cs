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
      OperationCancellationManager.Reset();
      var linkedCt = OperationCancellationManager.GetToken(ct);

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

      if (!dragRequest.Interval.HasValue || !dragRequest.StepSize.HasValue || !dragRequest.StepDelay.HasValue || !dragRequest.HoldTime.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required fields: Interval, StepSize, StepDelay, or HoldTime", ct);
        return;
      }

      await MouseSimulator.Drag(
        dragRequest.Start,
        dragRequest.End,
        linkedCt,
        dragRequest.Interval.Value,
        dragRequest.StepSize.Value,
        dragRequest.StepDelay.Value,
        dragRequest.HoldTime.Value
      );

      var response = new DragResponse
      {
        Success = true
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
      await MessageHandler.SendError(ws, message.Id, $"Error dragging: {ex.Message}", ct);
    }
  }
}
