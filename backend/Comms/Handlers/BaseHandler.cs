using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace IdleonBotBackend.Comms.Handlers;

internal abstract class BaseHandler : IWsHandler {
  public abstract bool CanHandle(string messageType);
  public abstract Task HandleAsync(WebSocket ws, WsRequest request);

  protected static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }
}

internal static class WsHandlerHelpers {
  private static readonly JsonSerializerSettings CamelCaseSettings = new() {
    ContractResolver = new CamelCasePropertyNamesContractResolver(),
    Formatting = Formatting.Indented
  };

  public static async Task Send(WebSocket ws, WsResponse response) {
    var json = System.Text.Json.JsonSerializer.Serialize(response);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
  }

  public static string SerializeToCamelCase<T>(T obj) {
    return JsonConvert.SerializeObject(obj, CamelCaseSettings);
  }
}

