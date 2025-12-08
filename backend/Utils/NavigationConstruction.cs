namespace IdleonHelperBackend.Utils;

/// <summary>
/// Navigation functionality specific to Construction features.
/// </summary>
public static class NavigationConstruction {
  /// <summary>
  /// Opens the Construction menu. Will attempt to open Quick-Ref (and Codex if needed) if Construction is not found.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding Construction (default: 100ms)</param>
  /// <returns>True if Construction was opened successfully, false otherwise</returns>
  public static async Task<bool> OpenConstruction(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    return await Navigation.NavigateTo(
      "quik-ref/construction.png",
      ct,
      fallback: (cancellationToken) => NavigationUI.OpenQuickRef(cancellationToken, timeoutMs),
      timeoutMs: timeoutMs
    );
  }

  /// <summary>
  /// Opens the Cogs tab inside Construction menu. Will attempt to open Construction if Cogs tab is not found.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding Cogs tab (default: 100ms)</param>
  /// <returns>True if Cogs tab was opened successfully, false otherwise</returns>
  public static async Task<bool> OpenCogsTab(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    return await Navigation.NavigateTo(
      "construction/cogs_tab.png",
      ct,
      fallback: (cancellationToken) => OpenConstruction(cancellationToken, timeoutMs),
      timeoutMs: timeoutMs
    );
  }

  /// <summary>
  /// Checks if trash is closed and closes it if open.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding elements (default: 100ms)</param>
  /// <returns>Tuple: (success, wasAlreadyClosed) - True if trash is closed (or was successfully closed), and whether it was already closed</returns>
  public static async Task<(bool success, bool wasAlreadyClosed)> EnsureTrashClosed(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // Check if trash is already closed
    bool isClosed = await Navigation.IsVisible("construction/cogs-trash-off.png", ct, timeoutMs);
    if (isClosed) {
      return (true, true);
    }

    // Trash is open, close it
    bool closed = await Navigation.NavigateTo("construction/cogs-trash.png", ct, null, timeoutMs);
    return (closed, false);
  }

  /// <summary>
  /// Checks if shelf is closed and closes it if open.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding elements (default: 100ms)</param>
  /// <returns>Tuple: (success, wasAlreadyClosed) - True if shelf is closed (or was successfully closed), and whether it was already closed</returns>
  public static async Task<(bool success, bool wasAlreadyClosed)> EnsureShelfClosed(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // Check if shelf is already closed
    bool isClosed = await Navigation.IsVisible("construction/cogs-shelf-off.png", ct, timeoutMs);
    if (isClosed) {
      return (true, true);
    }

    // Shelf is open, close it
    bool closed = await Navigation.NavigateTo("construction/cogs-shelf.png", ct, null, timeoutMs);
    return (closed, false);
  }

  /// <summary>
  /// Checks if on first page and navigates to it if not.
  /// Optimized: checks once, clicks multiple times fast, then checks again.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding elements (default: 100ms)</param>
  /// <returns>Tuple: (success, wasAlreadyOnFirstPage, pagesNavigated) - Success status, whether already on first page, and number of pages navigated</returns>
  public static async Task<(bool success, bool wasAlreadyOnFirstPage, int pagesNavigated)> EnsureFirstPage(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // Check if already on first page (prev button is disabled)
    bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, timeoutMs);
    if (isFirstPage) {
      return (true, true, 0);
    }

    // Not on first page, click prev button multiple times quickly, then check
    const int CLICKS_PER_BATCH = 20;
    const int MAX_BATCHES = 10; // Allow up to 200 pages total
    int totalPagesNavigated = 0;

    for (int batch = 0; batch < MAX_BATCHES; batch++) {
      ct.ThrowIfCancellationRequested();

      // Click multiple times quickly without checking between clicks
      int clicksInBatch = 0;
      for (int i = 0; i < CLICKS_PER_BATCH; i++) {
        ct.ThrowIfCancellationRequested();

        bool clicked = await Navigation.NavigateTo("construction/cogs-page-prev.png", ct, null, timeoutMs, clickInterval: 25);
        if (!clicked) {
          // If we can't click anymore, we might be on first page or button is gone
          break;
        }

        clicksInBatch++;
        totalPagesNavigated++;
      }

      // After batch of clicks, check if we're now on first page
      isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, timeoutMs);
      if (isFirstPage) {
        return (true, false, totalPagesNavigated);
      }

      // If we didn't click anything in this batch, we might be stuck or already at first page
      if (clicksInBatch == 0) {
        // Final check to see if we're on first page
        isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, timeoutMs);
        return (isFirstPage, false, totalPagesNavigated);
      }
    }

    // Reached max batches, do final check
    isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, timeoutMs);
    return (isFirstPage, false, totalPagesNavigated);
  }

  /// <summary>
  /// Prepares the Construction Cogs interface by opening the tab and ensuring proper state.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding elements (default: 100ms)</param>
  /// <returns>True if preparation was successful, false otherwise</returns>
  public static async Task<bool> PrepareCogsInterface(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // Open Construction menu
    bool constructionOpened = await OpenConstruction(ct, timeoutMs);
    if (!constructionOpened) {
      return false;
    }

    // Open Cogs tab
    bool cogsTabOpened = await OpenCogsTab(ct, timeoutMs);
    if (!cogsTabOpened) {
      return false;
    }

    // Ensure trash is closed
    var (trashClosed, _) = await EnsureTrashClosed(ct, timeoutMs);
    if (!trashClosed) {
      return false;
    }

    // Ensure shelf is closed
    var (shelfClosed, _) = await EnsureShelfClosed(ct, timeoutMs);
    if (!shelfClosed) {
      return false;
    }

    // Ensure we're on first page
    var (firstPage, _, _) = await EnsureFirstPage(ct, timeoutMs);
    if (!firstPage) {
      return false;
    }

    return true;
  }
}

