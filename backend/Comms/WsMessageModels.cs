namespace IdleonBotBackend.Comms;

internal record WsRequest(string type, string source);

internal record WsResponse(string type, string? source, string data);
