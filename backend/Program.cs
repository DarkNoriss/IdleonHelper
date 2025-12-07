using System.Net.WebSockets;
using System.Text;
using IdleonBotBackend.Comms;
using IdleonBotBackend.Utils;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Register cleanup on application shutdown
var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStopping.Register(() => {
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
    var buffer = new byte[4096];
    var ct = context.RequestAborted;

    try {
        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested) {
            using var ms = new MemoryStream();
            WebSocketReceiveResult? result = null;

            do {
                result = await ws.ReceiveAsync(buffer, ct);

                if (result.MessageType == WebSocketMessageType.Close) {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    return;
                }

                if (result.MessageType == WebSocketMessageType.Text) {
                    ms.Write(buffer, 0, result.Count);
                }
            } while (!result.EndOfMessage && result.MessageType == WebSocketMessageType.Text);

            if (result.MessageType == WebSocketMessageType.Text && ms.Length > 0) {
                ms.Position = 0;
                var json = Encoding.UTF8.GetString(ms.ToArray());
                await WsRouter.HandleMessageAsync(ws, json);
            }
        }
    } catch (OperationCanceledException) {
        // Connection cancelled - normal shutdown
    } catch (WebSocketException) {
        // WebSocket error - connection closed
    } catch (Exception) {
        // Unexpected error - connection closed
    }
});

app.Run();