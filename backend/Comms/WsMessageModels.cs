using System.Text.Json;

namespace IdleonBotBackend.Comms;

internal record WsRequest(string type, string source, JsonElement? data = null);

internal record WsResponse(string type, string? source, string data);
