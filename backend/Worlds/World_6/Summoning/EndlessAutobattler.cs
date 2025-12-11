using System.Drawing;
using IdleonHelperBackend.Navigation;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Worlds.World_6.Summoning;

public record EndlessAutobattlerResult(bool Success, string Message);

public static class EndlessAutobattler {
    private static int _dynamicYMin = 130;
    private static int _dynamicYMax = 325;
    private const int DRAG_X = 830;

    public static async Task<EndlessAutobattlerResult> StartAsync(CancellationToken cancellationToken) {
        while (true) {
            cancellationToken.ThrowIfCancellationRequested();

            var boardOpen = await EnsureBoardOpen(cancellationToken);
            if (!boardOpen) {
                continue;
            }

            await Task.Delay(1000, cancellationToken);

            var prepared = await PrepareBattle(cancellationToken);
            if (!prepared) {
                Console.WriteLine("[World6Summoning] Battle preparation failed; restarting");
                continue;
            }

            await RunMatchLoop(cancellationToken);
        }
    }

    private static async Task RunMatchLoop(CancellationToken ct) {
        while (true) {
            ct.ThrowIfCancellationRequested();

            var chestPoint = await FindChestAfterDrags(ct);
            await Task.Delay(300, ct);

            var timesClicked = 0;
            while (true) {
                ct.ThrowIfCancellationRequested();

                await MouseSimulator.Click(chestPoint, ct, interval: 500);
                timesClicked++;

                var stillVisible =
                    await UiInteraction.IsVisible("summoning/chest.png", ct);

                if (stillVisible) continue;

                Console.WriteLine($"[World6Summoning] Chest disappeared after {timesClicked} clicks");
                break;
            }

            // Extra confirmation click after a brief pause to claim reward
            await Task.Delay(3000, ct);
            await MouseSimulator.Click(chestPoint, ct);

            var endlessReady = await UiInteraction.IsVisible("summoning/endless.png", ct);
            if (endlessReady) {
                Console.WriteLine("[World6Summoning] Endless visible, restarting outer loop");
                return;
            }

            Console.WriteLine("[World6Summoning] Reopening summoning board");

            for (var i = 0; i < 10; i++) {
                ct.ThrowIfCancellationRequested();

                var opened = await NavigationSummoning.OpenSummoningBoard(ct);
                if (opened) {
                    Console.WriteLine("[World6Summoning] Summoning board reopened");
                    var endlessNow = await UiInteraction.IsVisible("summoning/endless.png", ct);
                    Console.WriteLine($"[World6Summoning] After reopen: endless visible = {endlessNow}");
                    var beginVisible = await UiInteraction.IsVisible("summoning/begin-match.png", ct);
                    Console.WriteLine($"[World6Summoning] After reopen: begin-match visible = {beginVisible}");
                    break;
                }

                Console.WriteLine("[World6Summoning] Failed to reopen summoning board; retrying");
                await Task.Delay(1000, ct);
            }

            // After reopen, restart outer loop (endless -> begin)
            return;
        }
    }

    private static async Task<bool> PrepareBattle(CancellationToken ct) {
        Console.WriteLine("[World6Summoning] Attempting to click endless");
        var endlessClicked = await UiInteraction.FindAndClick(
            "summoning/endless.png",
            ct,
            times: 2
        );

        if (!endlessClicked) {
            Console.WriteLine("[World6Summoning] Could not click endless; will retry from outer loop");
            return false;
        }

        await Task.Delay(1000, ct);

        await UpdateDynamicRange(ct);

        var beginClicked = await UiInteraction.FindAndClick(
            "summoning/begin-match.png",
            ct
        );

        if (beginClicked) return true;

        Console.WriteLine("[World6Summoning] Could not click begin-match; will retry from outer loop");
        return false;
    }

    private static async Task<bool> EnsureBoardOpen(CancellationToken ct) {
        var opened = await NavigationSummoning.OpenSummoningBoard(ct);

        if (opened) return await UiInteraction.IsVisible("summoning/endless.png", ct);

        Console.WriteLine("[World6Summoning] Failed to open summoning board");
        return false;
    }

    private static async Task<Point> FindChestAfterDrags(CancellationToken ct) {
        while (true) {
            ct.ThrowIfCancellationRequested();

            await MouseSimulator.DragRepeat(
                new Point(DRAG_X, _dynamicYMin),
                new Point(DRAG_X, _dynamicYMax),
                durationSeconds: 10,
                ct,
                stepSize: 1
            );

            var chestPoints = await UiInteraction.GetVisiblePoints("summoning/chest.png", ct);

            if (chestPoints.Count <= 0) continue;

            Console.WriteLine("[World6Summoning] Chest visible during drag loop");
            return chestPoints[0];
        }
    }

    private static async Task UpdateDynamicRange(CancellationToken ct) {
        var tiles = await UiInteraction.GetVisiblePoints("summoning/tile.png", ct, threshold: 0.95);

        if (tiles.Count == 0) {
            Console.WriteLine("[World6Summoning] No tiles detected; keeping previous drag range");
            return;
        }

        var minY = tiles.Min(p => p.Y);
        var maxY = tiles.Max(p => p.Y);

        _dynamicYMin = minY;
        _dynamicYMax = maxY + 20;

        Console.WriteLine($"[World6Summoning] Updated drag range Y: [{_dynamicYMin}, {_dynamicYMax}]");
    }
}

