using System.Drawing;
using IdleonHelperBackend.Utils;
using IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

namespace IdleonHelperBackend.Worlds.World3.Construction;

public static class TrashCogs {
  private const int PAGE_NAV_DELAY_MS = 250;

  public static async Task<bool> Trash(string source, CancellationToken ct) {
    try {
      Console.WriteLine("[Construction] TrashCogs started");

      bool prepared = await PrepareInterface(ct);
      if (!prepared) {
        Console.WriteLine("[Construction] TrashCogs preparation failed");
        return false;
      }

      // Generate all spare coordinates for a single page
      var spareCoords = GenerateSpareCoordinates();
      Console.WriteLine($"[Construction] Found {spareCoords.Count} spare slots per page");

      int currentPage = 1;

      while (true) {
        ct.ThrowIfCancellationRequested();
        Console.WriteLine($"[Construction] Processing page {currentPage}");

        // Click all spare slots on current page
        for (int i = 0; i < spareCoords.Count; i++) {
          ct.ThrowIfCancellationRequested();

          Point coord = spareCoords[i];
          Console.WriteLine($"[Construction] Clicking spare slot {i + 1}/{spareCoords.Count} on page {currentPage}: {coord}");

          await MouseSimulator.Click(coord, ct);
          await Task.Delay(50, ct); // Small delay between clicks to keep UI stable
        }

        // Check if there's a next page available
        bool hasNextPage = await Navigation.IsVisible("construction/cogs-page-next.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
        if (!hasNextPage) {
          Console.WriteLine("[Construction] No more pages found, trashing complete");
          break;
        }

        // Navigate to next page
        Console.WriteLine($"[Construction] Navigating to page {currentPage + 1}");
        bool navigated = await Navigation.NavigateTo("construction/cogs-page-next.png", ct, null, Navigation.DEFAULT_TIMEOUT_MS);
        if (!navigated) {
          Console.WriteLine("[Construction] Failed to navigate to next page");
          return false;
        }

        currentPage++;
        await Task.Delay(PAGE_NAV_DELAY_MS, ct); // Wait for page change
      }

      var (trashClosed, _) = await NavigationConstruction.EnsureTrashClosed(ct);
      if (!trashClosed) {
        Console.WriteLine("[Construction] Failed to close trash at end of run");
        return false;
      }

      Console.WriteLine("[Construction] TrashCogs finished");
      return true;
    } catch (Exception ex) {
      Console.WriteLine($"[Construction] TrashCogs exception: {ex.Message}");
      return false;
    }
  }

  private static async Task<bool> PrepareInterface(CancellationToken ct) {
    bool cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) {
      return false;
    }

    var (trashOpened, _) = await EnsureTrashOpen(ct);
    if (!trashOpened) {
      return false;
    }

    var (shelfClosed, _) = await NavigationConstruction.EnsureShelfClosed(ct);
    if (!shelfClosed) {
      return false;
    }

    var (firstPage, _, _) = await NavigationConstruction.EnsureFirstPage(ct);
    if (!firstPage) {
      return false;
    }

    await Task.Delay(PAGE_NAV_DELAY_MS, ct);
    return true;
  }

  private static List<Point> GenerateSpareCoordinates() {
    var coordinates = new List<Point>();

    for (int row = 0; row < BoardOptimizer.SPARE_ROWS; row++) {
      for (int col = 0; col < BoardOptimizer.SPARE_COLUMNS; col++) {
        Point coord = new Point(
          BoardOptimizer.SPARE_FIRST_COORDS.X + col * BoardOptimizer.COGS_STEP,
          BoardOptimizer.SPARE_FIRST_COORDS.Y + row * BoardOptimizer.COGS_STEP
        );
        coordinates.Add(coord);
      }
    }

    return coordinates;
  }

  private static async Task<(bool success, bool wasAlreadyOpen)> EnsureTrashOpen(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    bool isOpen = await Navigation.IsVisible("construction/cogs-trash.png", ct, timeoutMs);
    if (isOpen) {
      return (true, true);
    }

    bool opened = await Navigation.NavigateTo("construction/cogs-trash-off.png", ct, null, timeoutMs);
    if (!opened) {
      opened = await Navigation.NavigateTo("construction/cogs-trash.png", ct, null, timeoutMs);
    }

    return (opened, false);
  }
}

