using System.Drawing;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Worlds.World_6.Summoning;

public record AutobattlerResult(bool Success, string Message);

public static class Autobattler {
    private static int _dynamicYMin = 130;
    private static int _dynamicYMax = 325;
    private const int DRAG_X = 830;

    public static async Task<AutobattlerResult> StartAsync(CancellationToken ct) {
        var beginVisible = await UiInteraction.IsVisible("summoning/begin-match.png", ct);
        if (!beginVisible) {
            Console.WriteLine("[World6Autobattler] Begin-match not visible");
            return new AutobattlerResult(false, "Begin match not visible");
        }

        await UpdateDynamicRange(ct);

        var beginClicked = await UiInteraction.FindAndClick(
            "summoning/begin-match.png",
            ct
        );

        if (!beginClicked) {
            Console.WriteLine("[World6Autobattler] Failed to click begin-match");
            return new AutobattlerResult(false, "Could not click begin match");
        }

        var chestPoint = await FindChestAfterDrags(ct);
        Console.WriteLine($"[World6Autobattler] Chest found at {chestPoint}");

        return new AutobattlerResult(true, "Chest found");
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

            if (chestPoints.Count <= 0) {
                Console.WriteLine("[World6Autobattler] Chest not found, retrying drag");
                continue;
            }

            return chestPoints[0];
        }
    }

    private static async Task UpdateDynamicRange(CancellationToken ct) {
        var tiles = await UiInteraction.GetVisiblePoints("summoning/tile.png", ct, threshold: 0.95);

        if (tiles.Count == 0) {
            Console.WriteLine("[World6Autobattler] No tiles detected; using default drag range");
            return;
        }

        var minY = tiles.Min(p => p.Y);
        var maxY = tiles.Max(p => p.Y);

        _dynamicYMin = minY;
        _dynamicYMax = maxY + 20;

        Console.WriteLine($"[World6Autobattler] Updated drag range Y: [{_dynamicYMin}, {_dynamicYMax}]");
    }
}

