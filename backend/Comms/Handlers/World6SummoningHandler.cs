using System.Net.WebSockets;
using System.Collections.Concurrent;
using IdleonHelperBackend.Worlds.World_6.Summoning;

namespace IdleonHelperBackend.Comms.Handlers;

internal class World6SummoningHandler : BaseHandler {
    private const string ENDLESS_MESSAGE_TYPE = "world-6-summoning-start";
    private const string ENDLESS_CANCEL_MESSAGE_TYPE = "world-6-summoning-cancel";
    private const string AUTOBATTLER_MESSAGE_TYPE = "world-6-autobattler-start";
    private const string AUTOBATTLER_CANCEL_MESSAGE_TYPE = "world-6-autobattler-cancel";
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> ActiveRuns = new();

    public override bool CanHandle(string messageType) {
        return messageType is ENDLESS_MESSAGE_TYPE
            or ENDLESS_CANCEL_MESSAGE_TYPE
            or AUTOBATTLER_MESSAGE_TYPE
            or AUTOBATTLER_CANCEL_MESSAGE_TYPE;
    }

    public override async Task HandleAsync(WebSocket ws, WsRequest req) {
        Console.WriteLine(
            $"[World6Summoning] Received request type='{req.type}' source='{req.source}' data='{req.data?.GetRawText()}'");

        switch (req.type.ToLowerInvariant()) {
            case ENDLESS_MESSAGE_TYPE:
                await HandleEndlessStart(ws, req);
                break;
            case AUTOBATTLER_MESSAGE_TYPE:
                await HandleAutobattlerStart(ws, req);
                break;
            case ENDLESS_CANCEL_MESSAGE_TYPE:
            case AUTOBATTLER_CANCEL_MESSAGE_TYPE:
                await HandleCancel(ws, req);
                break;
        }
    }

    private static Task HandleEndlessStart(WebSocket ws, WsRequest req) {
        CancelAndRemoveExisting(req.source);

        var cts = new CancellationTokenSource();
        ActiveRuns[req.source] = cts;
        Console.WriteLine($"[World6Summoning] Stored CTS for source '{req.source}'");

        _ = Task.Run(async () => {
            try {
                Console.WriteLine($"[World6Summoning] Starting summoning for source '{req.source}'");
                var result = await EndlessAutobattler.StartAsync(cts.Token);
                var resultJson = WsHandlerHelpers.SerializeToCamelCase(result);

                await Send(ws, new WsResponse(
                    type: "data",
                    source: req.source,
                    data: resultJson
                ));

                await Send(ws, new WsResponse(
                    type: "done",
                    source: req.source,
                    data: "world-6-summoning-start finished"
                ));

                Console.WriteLine($"[World6Summoning] Summoning completed for source '{req.source}'");
            }
            catch (OperationCanceledException) {
                Console.WriteLine($"[World6Summoning] Summoning cancelled for source '{req.source}'");
                await Send(ws, new WsResponse(
                    type: "done",
                    source: req.source,
                    data: "world-6-summoning cancelled"
                ));
            }
            catch (Exception ex) {
                Console.WriteLine($"[World6Summoning] Summoning error for source '{req.source}': {ex.Message}");
                await Send(ws, new WsResponse(
                    type: "error",
                    source: req.source,
                    data: $"Failed to start world 6 summoning: {ex.Message}"
                ));
            }
            finally {
                ActiveRuns.TryRemove(req.source, out _);
                cts.Dispose();
                Console.WriteLine($"[World6Summoning] Cleaned CTS for source '{req.source}'");
            }
        }, cts.Token);

        return Task.CompletedTask;
    }

    private static Task HandleAutobattlerStart(WebSocket ws, WsRequest req) {
        CancelAndRemoveExisting(req.source);

        var cts = new CancellationTokenSource();
        ActiveRuns[req.source] = cts;
        Console.WriteLine($"[World6Autobattler] Stored CTS for source '{req.source}'");

        _ = Task.Run(async () => {
            try {
                Console.WriteLine($"[World6Autobattler] Starting autobattler for source '{req.source}'");
                var result = await Autobattler.StartAsync(cts.Token);
                var resultJson = WsHandlerHelpers.SerializeToCamelCase(result);

                await Send(ws, new WsResponse(
                    type: "data",
                    source: req.source,
                    data: resultJson
                ));

                await Send(ws, new WsResponse(
                    type: "done",
                    source: req.source,
                    data: "world-6-autobattler-start finished"
                ));

                Console.WriteLine($"[World6Autobattler] Autobattler completed for source '{req.source}'");
            }
            catch (OperationCanceledException) {
                Console.WriteLine($"[World6Autobattler] Autobattler cancelled for source '{req.source}'");
                await Send(ws, new WsResponse(
                    type: "done",
                    source: req.source,
                    data: "world-6-autobattler cancelled"
                ));
            }
            catch (Exception ex) {
                Console.WriteLine($"[World6Autobattler] Autobattler error for source '{req.source}': {ex.Message}");
                await Send(ws, new WsResponse(
                    type: "error",
                    source: req.source,
                    data: $"Failed to start world 6 autobattler: {ex.Message}"
                ));
            }
            finally {
                ActiveRuns.TryRemove(req.source, out _);
                cts.Dispose();
                Console.WriteLine($"[World6Autobattler] Cleaned CTS for source '{req.source}'");
            }
        }, cts.Token);

        return Task.CompletedTask;
    }

    private static async Task HandleCancel(WebSocket ws, WsRequest req) {
        var cancelled = CancelExisting(req.source);
        var cancelLabel = req.type.ToLowerInvariant() switch {
            AUTOBATTLER_CANCEL_MESSAGE_TYPE => "world-6-autobattler",
            _ => "world-6-summoning"
        };

        Console.WriteLine($"[World6Summoning] Cancel request for source '{req.source}', cancelled={cancelled}");

        await Send(ws, new WsResponse(
            type: cancelled ? "done" : "error",
            source: req.source,
            data: cancelled ? $"{cancelLabel} cancelled" : "No active summoning run to cancel"
        ));
    }

    private static bool CancelExisting(string source) {
        if (ActiveRuns.TryGetValue(source, out var existingCts)) {
            Console.WriteLine($"[World6Summoning] Cancelling existing run for source '{source}'");
            existingCts.Cancel();
            return true;
        }

        Console.WriteLine($"[World6Summoning] No active run found for source '{source}' to cancel");
        return false;
    }

    private static void CancelAndRemoveExisting(string source) {
        if (!ActiveRuns.TryRemove(source, out var existingCts)) return;
        Console.WriteLine($"[World6Summoning] Cancelling and removing existing run for source '{source}'");
        try {
            existingCts.Cancel();
        }
        finally {
            existingCts.Dispose();
        }
    }
}

