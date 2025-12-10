using System.Drawing;
using IdleonHelperBackend.Utils;
using IdleonHelperBackend.Navigation;
using IdleonHelperBackend.Worlds.World_3.Construction.Board;

namespace IdleonHelperBackend.Worlds.World_3.Construction;

public static class TrashCogs {
  public static async Task<bool> Trash(string source, CancellationToken ct) {
    try {
      Console.WriteLine("[Construction] TrashCogs started");

      var prepared = await PrepareInterface(ct);
      if (!prepared) {
        Console.WriteLine("[Construction] TrashCogs preparation failed");
        return false;
      }

      // Generate all spare coordinates for a single page
      var spareCoords = GenerateSpareCoordinates();

      var currentPage = 1;

      while (true) {
        ct.ThrowIfCancellationRequested();
        Console.WriteLine($"[Construction] Processing page {currentPage}");

        var pageCorrect = await NavigationConstruction.IsPageCorrect(currentPage, ct);
        if (!pageCorrect) {
          Console.WriteLine($"[Construction] Page {currentPage} is not correct");
          return false;
        }

        // Click all spare slots on current page
        for (var i = 0; i < spareCoords.Count; i++) {
          ct.ThrowIfCancellationRequested();

          var coord = spareCoords[i];
          Console.WriteLine(
            $"[Construction] Clicking spare slot {i + 1}/{spareCoords.Count} on page {currentPage}: {coord}");

          await MouseSimulator.Click(coord, ct);
        }

        // Check if there's a next page available
        var hasNextPage =
          await UiInteraction.IsVisible("construction/cogs-page-next.png", ct);
        if (!hasNextPage) {
          Console.WriteLine("[Construction] No more pages found, trashing complete");
          break;
        }

        // Navigate to next page
        Console.WriteLine($"[Construction] Navigating to page {currentPage + 1}");
        var navigated =
          await UiInteraction.FindAndClick("construction/cogs-page-next.png", ct);

        if (!navigated) {
          Console.WriteLine("[Construction] Failed to navigate to next page");
          return false;
        }

        currentPage++;
      }

      var trashClosed = await NavigationConstruction.EnsureTrashClosed(ct);
      if (!trashClosed) {
        Console.WriteLine("[Construction] Failed to close trash at end of run");
        return false;
      }

      Console.WriteLine("[Construction] TrashCogs finished");
      return true;
    }
    catch (Exception ex) {
      Console.WriteLine($"[Construction] TrashCogs exception: {ex.Message}");
      return false;
    }
  }

  private static async Task<bool> PrepareInterface(CancellationToken ct) {
    var cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) return false;


    var trashOpened = await NavigationConstruction.EnsureTrashOpen(ct);
    if (!trashOpened) return false;

    var shelfClosed = await NavigationConstruction.EnsureShelfClosed(ct);
    if (!shelfClosed) return false;

    return await NavigationConstruction.EnsureFirstPage(ct);
  }

  private static List<Point> GenerateSpareCoordinates() {
    var coordinates = new List<Point>();

    for (var row = 0; row < BoardOptimizer.SPARE_ROWS; row++) {
      for (var col = 0; col < BoardOptimizer.SPARE_COLUMNS; col++) {
        var coord = new Point(
          BoardOptimizer.SpareFirstCoords.X + col * BoardOptimizer.COGS_STEP,
          BoardOptimizer.SpareFirstCoords.Y + row * BoardOptimizer.COGS_STEP
        );

        coordinates.Add(coord);
      }
    }

    return coordinates;
  }
}

