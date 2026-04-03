using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text.Json;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class KeyPressCommandHandler
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
        JsonSerializer.Deserialize<KeyPressRequest>(message.Data.Value.GetRawText(), MessageHandler.JsonOptions);

      if (request == null)
      {
        await MessageHandler.SendError(ws, message.Id, "Invalid request data", ct);
        return;
      }

      var holdTime = request.HoldTime ?? 50;

      await KeyboardSimulator.KeyPress(request.Key, linkedCt, holdTime);

      var response = new KeyPressResponse
      {
        Success = true
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (OperationCanceledException)
    {
      await MessageHandler.SendError(ws, message.Id, "Operation was cancelled", ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error pressing key: {ex.Message}", ct);
    }
  }
}
