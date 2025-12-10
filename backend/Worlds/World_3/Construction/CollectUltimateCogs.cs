using System.Drawing;
using IdleonHelperBackend.Utils;
using IdleonHelperBackend.Worlds.World_3.Construction.Board;
using IdleonHelperBackend.Navigation;

namespace IdleonHelperBackend.Worlds.World_3.Construction;

public static class CollectUltimateCogs {
  private const int COLLECT_CLICKS_PER_ITERATION = 10;
  private const int MAX_COLLECT_ITERATIONS = 50;

  private static readonly Point CollectButtonCoords = new(284, 420);

  public static async Task<bool> Collect(string source, CancellationToken ct) {
    try {
      Console.WriteLine("[Construction] CollectUltimateCogs started");

      var prepared = await PrepareInterface(ct);
      if (!prepared) {
        Console.WriteLine("[Construction] CollectUltimateCogs preparation failed");
        return false;
      }


      for (int iteration = 1; iteration <= MAX_COLLECT_ITERATIONS; iteration++) {
        ct.ThrowIfCancellationRequested();

        Console.WriteLine(
          $"[Construction] Collect iteration {iteration}: clicking {COLLECT_CLICKS_PER_ITERATION} times at {CollectButtonCoords}");
        await MouseSimulator.Click(CollectButtonCoords, ct, times: COLLECT_CLICKS_PER_ITERATION);

        var hasSpace =
          await UiInteraction.IsVisible("construction/board_empty.png", ct, offset: GetSpareSearchOffset());
        if (!hasSpace) {
          Console.WriteLine("[Construction] Collection complete - board full");
          return true;
        }

        if (iteration != MAX_COLLECT_ITERATIONS) continue;

        Console.WriteLine("[Construction] Collection aborted - max iterations reached while space remained");
        return false;
      }

      var shelfClosed = await NavigationConstruction.EnsureShelfClosed(ct);
      if (!shelfClosed) {
        Console.WriteLine("[Construction] Failed to close shelf after collecting");
        return false;
      }

      Console.WriteLine("[Construction] CollectUltimateCogs finished");
      return true;
    }
    catch (Exception ex) {
      Console.WriteLine($"[Construction] CollectUltimateCogs exception: {ex.Message}");
      return false;
    }
  }

  private static async Task<bool> PrepareInterface(CancellationToken ct) {
    var cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) {
      return false;
    }

    var trashClosed = await NavigationConstruction.EnsureTrashClosed(ct);
    if (!trashClosed) {
      return false;
    }

    var shelfOpened = await NavigationConstruction.EnsureShelfOpen(ct);
    if (!shelfOpened) {
      return false;
    }

    return await NavigationConstruction.EnsureLastPage(ct);
  }


  private static ImageProcessing.ScreenOffset GetSpareSearchOffset(int padding = 4) {
    int left = BoardOptimizer.SpareFirstCoords.X - padding;
    int right = BoardOptimizer.SpareFirstCoords.X + (BoardOptimizer.SPARE_COLUMNS * BoardOptimizer.COGS_STEP) +
                padding;
    int top = BoardOptimizer.SpareFirstCoords.Y - padding;
    int bottom = BoardOptimizer.SpareFirstCoords.Y + (BoardOptimizer.SPARE_ROWS * BoardOptimizer.COGS_STEP) +
                 padding;
    return new ImageProcessing.ScreenOffset(left, right, top, bottom);
  }
}

