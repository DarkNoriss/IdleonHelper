using System.Net.WebSockets;
using System.Text;
using IdleonBotBackend.Comms;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

app.MapGet("/", () => "Hello World!");

// WebSocket JSON-only handler
app.Map("/ws", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("WebSocket endpoint only");
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    Console.WriteLine("[WS] client connected");

    var buffer = new byte[4096];

    try
    {
        while (ws.State == WebSocketState.Open)
        {
            var result = await ws.ReceiveAsync(buffer, CancellationToken.None);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                Console.WriteLine("[WS] close from client");
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                break;
            }

            if (result.MessageType != WebSocketMessageType.Text)
                continue;

            var json = Encoding.UTF8.GetString(buffer, 0, result.Count);

            // 🔹 całą logikę wrzucamy do routera
            await WsRouter.HandleMessageAsync(ws, json);
        }
    }
    catch (WebSocketException ex)
    {
        Console.WriteLine($"[WS] WebSocketException: {ex.Message}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[WS] Exception: {ex}");
    }

    Console.WriteLine("[WS] handler finished");
});

app.Run();
