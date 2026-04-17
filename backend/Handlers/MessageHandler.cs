using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;
using IdleonHelperBackend.Models;

namespace IdleonHelperBackend.Handlers;

[SupportedOSPlatform("windows10.0.19041.0")]
internal static class MessageHandler
{
  internal static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
  {
    PropertyNameCaseInsensitive = true
  };

  private static readonly SemaphoreSlim _sendSemaphore = new SemaphoreSlim(1, 1);

  public static async Task HandleMessage(WebSocket ws, string messageJson, CancellationToken ct)
  {
    try
    {
      var message = JsonSerializer.Deserialize<WebSocketMessage>(messageJson);

      if (message == null || string.IsNullOrEmpty(message.Command))
      {
        await SendError(ws, null, "Invalid message format", ct);
        return;
      }

      switch (message.Command)
      {
        case "find":
        {
          await FindCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "findWithDebug":
        {
          await FindWithDebugCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "click":
        {
          await ClickCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "drag":
        {
          await DragCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "dragRepeat":
        {
          await DragRepeatCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "dragPath":
        {
          await DragPathCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "stop":
        {
          await StopCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "keyPress":
        {
          await KeyPressCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "scroll":
        {
          await ScrollCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "findParallel":
        {
          await FindParallelCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "readRegions":
        {
          await ReadRegionsCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "captureHsvScreen":
        {
          await CaptureHsvScreenCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "findHSV":
        {
          await FindHSVCommandHandler.Handle(ws, message, ct);
          break;
        }
        case "findHSVParallel":
        {
          await FindHSVParallelCommandHandler.Handle(ws, message, ct);
          break;
        }
        default:
        {
          await SendError(ws, message.Id, $"Unknown command: {message.Command}", ct);
          break;
        }
      }
    }
    catch (JsonException ex)
    {
      await SendError(ws, null, $"Invalid JSON: {ex.Message}", ct);
    }
    catch (Exception ex)
    {
      await SendError(ws, null, $"Error: {ex.Message}", ct);
    }
  }

  internal static async Task SendResponse(WebSocket ws, string? messageId, object data, CancellationToken ct)
  {
    var response = new
    {
      id = messageId,
      type = "response",
      data
    };

    await SendJson(ws, response, ct);
  }

  internal static async Task SendError(WebSocket ws, string? messageId, string error, CancellationToken ct)
  {
    var response = new
    {
      id = messageId,
      type = "error",
      error
    };

    await SendJson(ws, response, ct);
  }

  private static async Task SendJson(WebSocket ws, object data, CancellationToken ct)
  {
    if (ws.State != WebSocketState.Open) return;

    await _sendSemaphore.WaitAsync(ct);
    try
    {
      if (ws.State != WebSocketState.Open) return;

      var json = JsonSerializer.Serialize(data);
      var bytes = Encoding.UTF8.GetBytes(json);
      await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
    }
    finally
    {
      _sendSemaphore.Release();
    }
  }
}
