using System.Net.WebSockets;
using System.Runtime.Versioning;
using System.Text;
using IdleonHelperBackend.Handlers;

[assembly: SupportedOSPlatform("windows10.0.19041.0")]

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

app.Map("/ws", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("WebSocket endpoint only");
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    var buffer = new byte[1024 * 64];

    try
    {
        while (ws.State == WebSocketState.Open)
        {
            using var ms = new MemoryStream();
            WebSocketReceiveResult result;

            do
            {
                result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), context.RequestAborted);
                ms.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed by client", context.RequestAborted);
                break;
            }

            if (result.MessageType != WebSocketMessageType.Text) continue;

            var messageJson = Encoding.UTF8.GetString(ms.ToArray());

            _ = Task.Run(async () =>
            {
                try
                {
                    await MessageHandler.HandleMessage(ws, messageJson, context.RequestAborted);
                }
                catch
                {
                }
            }, context.RequestAborted);
        }
    }
    catch
    {
    }
});

app.Run();