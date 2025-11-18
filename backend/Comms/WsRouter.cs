using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace IdleonBotBackend.Comms;

internal static class WsRouter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task HandleMessageAsync(WebSocket ws, string json)
    {
        Console.WriteLine($"[WS] recv json: {json}");

        WsRequest? req;
        try
        {
            req = JsonSerializer.Deserialize<WsRequest>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WS] invalid json: {ex.Message}");
            return;
        }

        if (req is null || string.IsNullOrWhiteSpace(req.type) || string.IsNullOrWhiteSpace(req.source))
        {
            Console.WriteLine("[WS] invalid payload (missing type/source)");
            return;
        }

        switch (req.type.ToLowerInvariant())
        {
            case "ping":
                await Send(ws, new WsResponse(
                    type: "pong",
                    source: req.source,
                    data: "pong"
                ));
                break;

            case "world-3-construction":
                await HandleWorld3Construction(ws, req);
                break;

            default:
                await Send(ws, new WsResponse(
                    type: "error",
                    source: req.source,
                    data: $"unknown type '{req.type}'"
                ));
                break;
        }
    }

    private static async Task HandleWorld3Construction(WebSocket ws, WsRequest req)
    {
        Console.WriteLine("[WS] world-3-construction start");

        await Send(ws, new WsResponse(
            type: "log",
            source: req.source,
            data: "Starting world-3 construction..."
        ));

        await Task.Delay(300);

        await Send(ws, new WsResponse(
            type: "log",
            source: req.source,
            data: "TODO: capture screen, find building, click..."
        ));

        await Task.Delay(300);

        await Send(ws, new WsResponse(
            type: "done",
            source: req.source,
            data: "world-3-construction finished"
        ));

        Console.WriteLine("[WS] world-3-construction done");
    }

    private static async Task Send(WebSocket ws, WsResponse response)
    {
        var json = JsonSerializer.Serialize(response);
        var bytes = Encoding.UTF8.GetBytes(json);
        await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
