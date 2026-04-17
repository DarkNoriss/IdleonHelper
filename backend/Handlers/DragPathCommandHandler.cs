using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class DragPathCommandHandler
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
        JsonSerializer.Deserialize<DragPathRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      if (request.Points == null || request.Points.Count < 2)
      {
        await MessageHandler.SendError(ws, message.Id, "DragPath requires at least 2 points", ct);
        return;
      }

      if (!request.StepSize.HasValue || !request.StepDelay.HasValue || !request.HoldTime.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required fields: StepSize, StepDelay, or HoldTime", ct);
        return;
      }

      await MouseSimulator.DragPath(
        request.Points,
        linkedCt,
        request.StepSize.Value,
        request.StepDelay.Value,
        request.HoldTime.Value
      );

      var response = new DragPathResponse
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
      await MessageHandler.SendError(ws, message.Id, $"Error dragging path: {ex.Message}", ct);
    }
  }
}
