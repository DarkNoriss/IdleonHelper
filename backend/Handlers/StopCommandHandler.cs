using System.Net.WebSockets;
using IdleonHelperBackend.Models;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Handlers;

internal static class StopCommandHandler
{
  public static async Task Handle(WebSocket ws, WebSocketMessage message, CancellationToken ct)
  {
    try
    {
      // Cancel the current operation
      OperationCancellationManager.Cancel();

      var response = new StopResponse
      {
        Success = true
      };

      await MessageHandler.SendResponse(ws, message.Id, response, ct);
    }
    catch (Exception ex)
    {
      await MessageHandler.SendError(ws, message.Id, $"Error stopping operation: {ex.Message}", ct);
    }
  }
}

