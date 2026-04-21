using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class ClickManyCommandHandler
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
        JsonSerializer.Deserialize<ClickManyRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      if (!request.Interval.HasValue || !request.HoldTime.HasValue)
      {
        await MessageHandler.SendError(ws, message.Id, "Missing required fields: Interval or HoldTime", ct);
        return;
      }

      foreach (var point in request.Points)
      {
        linkedCt.ThrowIfCancellationRequested();
        await MouseSimulator.Click(
          point,
          linkedCt,
          1,
          request.Interval.Value,
          request.HoldTime.Value
        );
      }

      var response = new ClickManyResponse
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
      await MessageHandler.SendError(ws, message.Id, $"Error clicking: {ex.Message}", ct);
    }
  }
}
