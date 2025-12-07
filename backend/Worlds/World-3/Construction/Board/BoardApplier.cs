using System.Drawing;
using IdleonBotBackend.Utils;
using IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

namespace IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class BoardApplier {
  /// <summary>
  /// Calculates screen coordinates for a cog position.
  /// </summary>
  private static Point CalculateCoords(string location, Point pos) {
    Point baseCoords = location == "board" 
      ? BoardOptimizer.BOARD_FIRST_COORDS 
      : BoardOptimizer.SPARE_FIRST_COORDS;

    return new Point(
      baseCoords.X + pos.X * BoardOptimizer.COGS_STEP,
      baseCoords.Y + pos.Y * BoardOptimizer.COGS_STEP
    );
  }

  /// <summary>
  /// Gets the current page number by checking button states.
  /// Returns 1 if on first page, or detects current page by checking disabled buttons.
  /// </summary>
  private static async Task<int> GetCurrentPage(CancellationToken ct) {
    // Check if we're on first page (prev button disabled)
    bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
    if (isFirstPage) {
      return 1;
    }

    // Check if we're on last page (next button disabled)
    bool isLastPage = await Navigation.IsVisible("construction/cogs-page-next-off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
    if (isLastPage) {
      // We can't determine exact page number from last page, but we know we're not on page 1
      // For now, we'll need to track it differently or navigate from first page
      // This is a limitation - we'd need to count pages or track navigation
      return -1; // Unknown, but not page 1
    }

    // Neither button is disabled, so we're somewhere in the middle
    // We can't determine exact page without tracking, so return -1
    return -1;
  }

  /// <summary>
  /// Navigates to a specific page by clicking next/prev buttons.
  /// Verifies button availability before clicking.
  /// Returns (success, newCurrentPage).
  /// </summary>
  private static async Task<(bool success, int newCurrentPage)> NavigateToPage(int targetPage, int currentPage, CancellationToken ct) {
    // Verify we're actually on the page we think we are (especially for page 1)
    if (targetPage == 1) {
      bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
      if (isFirstPage) {
        return (true, 1);
      }
    }

    // Detect actual current page if unknown or incorrect
    if (currentPage < 1 || (currentPage == 1 && !await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS))) {
      // Navigate to first page first to establish baseline
      int verifiedPage = 1;
      while (true) {
        ct.ThrowIfCancellationRequested();
        bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
        if (isFirstPage) {
          verifiedPage = 1;
          break;
        }
        bool prevButtonEnabled = await Navigation.IsVisible("construction/cogs-page-prev.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
        if (!prevButtonEnabled) {
          // Button not found, might already be on first page
          verifiedPage = 1;
          break;
        }
        bool clicked = await Navigation.NavigateTo("construction/cogs-page-prev.png", ct, null, Navigation.DEFAULT_TIMEOUT_MS, clickInterval: 25);
        if (!clicked) {
          return (false, currentPage);
        }
      }
      currentPage = verifiedPage;
    }

    // Check again if we're already on target page after verification
    if (targetPage == currentPage) {
      // Double-check for page 1
      if (targetPage == 1) {
        bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
        if (isFirstPage) {
          return (true, 1);
        }
      } else {
        return (true, currentPage);
      }
    }

    int pagesToNavigate = targetPage - currentPage;
    bool isNext = pagesToNavigate > 0;
    int pagesToClick = Math.Abs(pagesToNavigate);
    int newPage = currentPage;

    for (int i = 0; i < pagesToClick; i++) {
      ct.ThrowIfCancellationRequested();

      // Check if button is enabled before clicking
      string enabledButton = isNext ? "construction/cogs-page-next.png" : "construction/cogs-page-prev.png";
      string disabledButton = isNext ? "construction/cogs-page-next-off.png" : "construction/cogs-page-prev_off.png";

      // Check if button is disabled (we've reached the limit)
      bool isDisabled = await Navigation.IsVisible(disabledButton, ct, Navigation.DEFAULT_TIMEOUT_MS);
      if (isDisabled) {
        // We've reached the first or last page
        if (!isNext) {
          // Tried to go prev but reached first page
          bool isFirstPage = await Navigation.IsVisible("construction/cogs-page-prev_off.png", ct, Navigation.DEFAULT_TIMEOUT_MS);
          if (isFirstPage && targetPage == 1) {
            return (true, 1);
          }
        } else {
          // Tried to go next but reached last page - can't reach target if it's not the last page
          // We don't know what the last page number is, so we can't verify
          return (false, newPage);
        }
        return (false, newPage);
      }

      // Button is enabled, click it
      bool clicked = await Navigation.NavigateTo(enabledButton, ct, null, Navigation.DEFAULT_TIMEOUT_MS, clickInterval: 25);
      if (!clicked) {
        return (false, newPage);
      }

      // Update current page tracking
      if (isNext) {
        newPage++;
      } else {
        newPage--;
      }
    }

    return (true, newPage);
  }

  /// <summary>
  /// Calculates which page a spare cog is on based on its Y position.
  /// Uses SPARE_COLUMNS to determine rows per page (despite the name).
  /// </summary>
  private static int CalculateSparePage(int yPosition) {
    return (yPosition / BoardOptimizer.SPARE_COLUMNS) + 1;
  }

  /// <summary>
  /// Calculates the local Y position within a page for a spare cog.
  /// </summary>
  private static int CalculateSpareLocalY(int yPosition) {
    return yPosition % BoardOptimizer.SPARE_COLUMNS;
  }

  /// <summary>
  /// Prepares the Construction Cogs interface by opening the tab and ensuring proper state.
  /// </summary>
  private static async Task<bool> PrepareConstructionInterface(CancellationToken ct) {
    // Open Cogs tab (will open Construction as fallback if needed)
    bool cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) {
      return false;
    }

    // Ensure trash is closed
    var (trashClosed, _) = await NavigationConstruction.EnsureTrashClosed(ct);
    if (!trashClosed) {
      return false;
    }

    // Ensure shelf is closed
    var (shelfClosed, _) = await NavigationConstruction.EnsureShelfClosed(ct);
    if (!shelfClosed) {
      return false;
    }

    // Ensure we're on first page
    var (firstPage, _, _) = await NavigationConstruction.EnsureFirstPage(ct);
    if (!firstPage) {
      return false;
    }

    return true;
  }

  /// <summary>
  /// Applies the optimized board by executing steps with drag operations.
  /// </summary>
  public static async Task<bool> ApplyBoard(string source, CancellationToken ct) {
    try {
      // Prepare construction interface
      bool prepared = await PrepareConstructionInterface(ct);
      if (!prepared) {
        return false;
      }

      var inventory = BoardOptimizer.GetInventory(source);
      if (inventory == null) {
        return false;
      }

      // Get optimized steps
      var steps = Steps.GetOptimalSteps(inventory.Cogs, ct);

      int currentPage = 1;

      foreach (var step in steps) {
        ct.ThrowIfCancellationRequested();

        // Get positions for source and target cogs
        var pos1 = step.Cog.Position(step.KeyFrom);
        var pos2 = step.TargetCog.Position(step.KeyTo);

        Point startCoords = new(), endCoords = new();

        // Handle source cog
        if (pos1.Location == "board") {
          startCoords = CalculateCoords(pos1.Location, new Point(pos1.X, pos1.Y));
        } else if (pos1.Location == "spare") {
          int targetPage = CalculateSparePage(pos1.Y);
          int localY = CalculateSpareLocalY(pos1.Y);
          Point localPos = new Point(pos1.X, localY);

          // Navigate to the correct page if needed
          if (currentPage != targetPage) {
            var (navigated, newPage) = await NavigateToPage(targetPage, currentPage, ct);
            if (!navigated) {
              return false;
            }
            currentPage = newPage;
          }

          startCoords = CalculateCoords("spare", localPos);
        }

        // Handle target cog
        if (pos2.Location == "board") {
          endCoords = CalculateCoords(pos2.Location, new Point(pos2.X, pos2.Y));
        } else if (pos2.Location == "spare") {
          int targetPage = CalculateSparePage(pos2.Y);
          int localY = CalculateSpareLocalY(pos2.Y);
          Point localPos = new Point(pos2.X, localY);

          // Navigate to the correct page if needed
          if (currentPage != targetPage) {
            var (navigated, newPage) = await NavigateToPage(targetPage, currentPage, ct);
            if (!navigated) {
              return false;
            }
            currentPage = newPage;
          }

          endCoords = CalculateCoords("spare", localPos);
        }

        // Perform drag operation
        await MouseSimulator.Drag(startCoords, endCoords, ct, stepSize: 10);
      }

      return true;
    } catch (Exception ex) {
      return false;
    }
  }
}

