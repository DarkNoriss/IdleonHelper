using System.Net.WebSockets;
using System.Runtime.Versioning;

[assembly: SupportedOSPlatform("windows")]

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

app.Map("/ws", async context => {
    if (!context.WebSockets.IsWebSocketRequest) {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("WebSocket endpoint only");
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    
    // Keep connection open until closed
    while (ws.State == WebSocketState.Open) {
        await Task.Delay(100, context.RequestAborted);
    }
});

app.Run();