using System.Net.WebSockets;
using System.Text;
using IdleonBotBackend.Comms;
using IdleonBotBackend.Utils;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Register cleanup on application shutdown
var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStopping.Register(() => {
    Console.WriteLine("[App] Shutting down, cleaning up resources...");
    WindowCapture.Cleanup();
});

app.UseWebSockets();

app.MapGet("/", () => "Hello World!");

app.Map("/ws", async context => {
    if (!context.WebSockets.IsWebSocketRequest) {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("WebSocket endpoint only");
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    Console.WriteLine("[WS] client connected");

    var buffer = new byte[4096];

    try {
        // Use the request abort token for cancellation
        var ct = context.RequestAborted;

        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested) {
            // Accumulate message fragments
            using var ms = new MemoryStream();
            WebSocketReceiveResult? result = null;

            // Keep receiving until we get the complete message
            do {
                result = await ws.ReceiveAsync(buffer, ct);

                if (result.MessageType == WebSocketMessageType.Close) {
                    Console.WriteLine("[WS] close from client");
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    return;
                }

                if (result.MessageType == WebSocketMessageType.Text) {
                    ms.Write(buffer, 0, result.Count);
                } else if (result.MessageType == WebSocketMessageType.Binary) {
                    // Skip binary messages
                    continue;
                }
            } while (!result.EndOfMessage && result.MessageType == WebSocketMessageType.Text);

            // Only process if we received text
            if (result.MessageType == WebSocketMessageType.Text && ms.Length > 0) {
                ms.Position = 0;
                var json = Encoding.UTF8.GetString(ms.ToArray());
                await WsRouter.HandleMessageAsync(ws, json);
            }
        }
    } catch (OperationCanceledException) {
        Console.WriteLine("[WS] Connection cancelled");
    } catch (WebSocketException ex) {
        Console.WriteLine($"[WS] WebSocketException: {ex.Message}");
    } catch (Exception ex) {
        Console.WriteLine($"[WS] Exception: {ex}");
    } finally {
        // Optional: cleanup per-connection if needed
        Console.WriteLine("[WS] handler finished");
    }
});

app.Run();