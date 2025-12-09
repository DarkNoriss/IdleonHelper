using System.Drawing;
using IdleonHelperBackend.Utils;
using IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

namespace IdleonHelperBackend.Worlds.World3.Construction;

public static class CollectUltimateCogs {
  private const int PAGE_NAV_DELAY_MS = 250;
  private const int COLLECT_CLICKS_PER_ITERATION = 10;
  private const int MAX_COLLECT_ITERATIONS = 50;
  private static readonly Point COLLECT_BUTTON_COORDS = new(284, 420);

  public static async Task<bool> Collect(string source, CancellationToken ct) {
    try {
      Console.WriteLine("[Construction] CollectUltimateCogs started");

      bool prepared = await PrepareInterface(ct);
      if (!prepared) {
        Console.WriteLine("[Construction] CollectUltimateCogs preparation failed");
        return false;
      }

      using var boardEmptyTemplate = ImageProcessing.LoadImage(Navigation.GetAssetPath("construction/board_empty.png"));

      for (int iteration = 1; iteration <= MAX_COLLECT_ITERATIONS; iteration++) {
        ct.ThrowIfCancellationRequested();

        Console.WriteLine($"[Construction] Collect iteration {iteration}: clicking {COLLECT_CLICKS_PER_ITERATION} times at {COLLECT_BUTTON_COORDS}");
        await MouseSimulator.Click(COLLECT_BUTTON_COORDS, ct, times: COLLECT_CLICKS_PER_ITERATION);

        var matches = await ImageProcessing.FindAsync(
          boardEmptyTemplate,
          ct,
          timeoutMs: Navigation.DEFAULT_TIMEOUT_MS,
          offset: GetSpareSearchOffset()
        );
        bool hasSpace = matches.Count > 0;
        Console.WriteLine($"[Construction] Board empty matches after iteration {iteration}: count={matches.Count}");
        if (matches.Count > 0) {
          Console.WriteLine($"[Construction] First empty slot at {matches[0]}");
        }

        if (!hasSpace) {
          Console.WriteLine("[Construction] Collection complete - board full");
          break;
        }

        await Task.Delay(PAGE_NAV_DELAY_MS, ct);

        if (iteration == MAX_COLLECT_ITERATIONS) {
          Console.WriteLine("[Construction] Collection aborted - max iterations reached while space remained");
          return false;
        }
      }

      var (shelfClosed, _) = await NavigationConstruction.EnsureShelfClosed(ct);
      if (!shelfClosed) {
        Console.WriteLine("[Construction] Failed to close shelf after collecting");
        return false;
      }

      Console.WriteLine("[Construction] CollectUltimateCogs finished");
      return true;
    } catch (Exception ex) {
      Console.WriteLine($"[Construction] CollectUltimateCogs exception: {ex.Message}");
      return false;
    }
  }

  private static async Task<bool> PrepareInterface(CancellationToken ct) {
    bool cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) {
      return false;
    }

    var (trashClosed, _) = await NavigationConstruction.EnsureTrashClosed(ct);
    if (!trashClosed) {
      return false;
    }

    var (shelfOpened, _) = await EnsureShelfOpen(ct);
    if (!shelfOpened) {
      return false;
    }

    var (lastPage, _, _) = await EnsureLastPage(ct);
    if (!lastPage) {
      return false;
    }

    await Task.Delay(PAGE_NAV_DELAY_MS, ct);
    return true;
  }

  private static async Task<(bool success, bool wasAlreadyOpen)> EnsureShelfOpen(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // If shelf toggle is in "on" state, we're already open
    bool isOpen = await Navigation.IsVisible("construction/cogs-shelf.png", ct, timeoutMs);
    if (isOpen) {
      return (true, true);
    }

    // Try opening via the "off" state icon first, then fall back to main icon
    bool opened = await Navigation.NavigateTo("construction/cogs-shelf-off.png", ct, null, timeoutMs);
    if (!opened) {
      opened = await Navigation.NavigateTo("construction/cogs-shelf.png", ct, null, timeoutMs);
    }

    return (opened, false);
  }

  private static async Task<(bool success, bool wasAlreadyOnLastPage, int pagesNavigated)> EnsureLastPage(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    bool isLastPage = await Navigation.IsVisible("construction/cogs-page-next-off.png", ct, timeoutMs);
    if (isLastPage) {
      return (true, true, 0);
    }

    const int CLICKS_PER_BATCH = 20;
    const int MAX_BATCHES = 10;
    int totalPagesNavigated = 0;

    for (int batch = 0; batch < MAX_BATCHES; batch++) {
      ct.ThrowIfCancellationRequested();

      int clicksInBatch = 0;
      for (int i = 0; i < CLICKS_PER_BATCH; i++) {
        ct.ThrowIfCancellationRequested();

        bool clicked = await Navigation.NavigateTo("construction/cogs-page-next.png", ct, null, timeoutMs, clickInterval: 25);
        if (!clicked) {
          break;
        }

        clicksInBatch++;
        totalPagesNavigated++;
      }

      isLastPage = await Navigation.IsVisible("construction/cogs-page-next-off.png", ct, timeoutMs);
      if (isLastPage) {
        return (true, false, totalPagesNavigated);
      }

      if (clicksInBatch == 0) {
        isLastPage = await Navigation.IsVisible("construction/cogs-page-next-off.png", ct, timeoutMs);
        return (isLastPage, false, totalPagesNavigated);
      }

      await Task.Delay(PAGE_NAV_DELAY_MS, ct);
    }

    isLastPage = await Navigation.IsVisible("construction/cogs-page-next-off.png", ct, timeoutMs);
    return (isLastPage, false, totalPagesNavigated);
  }

  private static ImageProcessing.ScreenOffset GetSpareSearchOffset(int padding = 4) {
    int left = BoardOptimizer.SPARE_FIRST_COORDS.X - padding;
    int right = BoardOptimizer.SPARE_FIRST_COORDS.X + (BoardOptimizer.SPARE_COLUMNS * BoardOptimizer.COGS_STEP) + padding;
    int top = BoardOptimizer.SPARE_FIRST_COORDS.Y - padding;
    int bottom = BoardOptimizer.SPARE_FIRST_COORDS.Y + (BoardOptimizer.SPARE_ROWS * BoardOptimizer.COGS_STEP) + padding;
    return new ImageProcessing.ScreenOffset(left, right, top, bottom);
  }
}

