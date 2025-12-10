using System.Drawing;
using IdleonHelperBackend.Utils;
using IdleonHelperBackend.Navigation;

namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

public static class BoardApplier {
  private const int MAX_SPARE_PAGES = 7;

  private static string FormatLocation(string location, int x, int y, int? page) {
    var loc = location.ToUpperInvariant();
    var coords = $"{x}, {y}";
    return page.HasValue ? $"{loc} {coords} PAGE {page.Value}" : $"{loc} {coords}";
  }

  private static Point CalculateCoords(string location, Point pos) {
    var baseCoords = location == "board"
      ? BoardOptimizer.BoardFirstCoords
      : BoardOptimizer.SpareFirstCoords;

    return new Point(
      baseCoords.X + pos.X * BoardOptimizer.COGS_STEP,
      baseCoords.Y + pos.Y * BoardOptimizer.COGS_STEP
    );
  }


  private static async Task<int?> DetectCurrentPage(CancellationToken ct) {
    var detectionTasks = Enumerable
      .Range(1, MAX_SPARE_PAGES)
      .Select(async page => new {
        Page = page,
        Match = await NavigationConstruction.IsPageCorrect(page, ct)
      })
      .ToList();

    var results = await Task.WhenAll(detectionTasks);
    var resultsLog = string.Join(", ", results.Select(r => $"page={r.Page}:{(r.Match ? "match" : "miss")}"));
    Console.WriteLine($"[Construction] Page detection results: {resultsLog}");

    var found = results.FirstOrDefault(r => r.Match);

    if (found != null) {
      Console.WriteLine($"[Construction] Page detection confidence: matched page {found.Page}");
      return found.Page;
    }

    Console.WriteLine("[Construction] Unable to detect current spare page (no matches)");
    return null;
  }

  private static async Task<int?> NavigateToPage(int targetPage, int currentPage, CancellationToken ct) {
    Console.WriteLine($"[Construction] NavigateToPage start: target={targetPage}, current={currentPage}");

    var attempts = 0;
    const int maxAttempts = MAX_SPARE_PAGES * 3; // generous guard

    while (attempts < maxAttempts) {
      attempts++;

      // Step 1: move based on the difference we think we have
      var diff = targetPage - currentPage;
      if (diff != 0) {
        var goForward = diff > 0;
        var stepsToClick = Math.Abs(diff);
        Console.WriteLine(
          $"[Construction] Navigate attempt {attempts}: diff={diff}, steps={stepsToClick}, direction={(goForward ? "next" : "prev")}");

        for (var i = 0; i < stepsToClick; i++) {
          var clicked = await UiInteraction.FindAndClick(
            goForward ? "construction/cogs-page-next.png" : "construction/cogs-page-prev.png",
            ct
          );

          if (clicked) continue;

          var disabledVisible = await UiInteraction.IsVisible(
            goForward ? "construction/cogs-page-next-off.png" : "construction/cogs-page-prev-off.png", ct);

          if (disabledVisible) {
            var boundaryPage = goForward ? MAX_SPARE_PAGES : 1;
            Console.WriteLine(
              $"[Construction] Nav button disabled; assuming boundary page {boundaryPage} (attempt {attempts}, click {i + 1}/{stepsToClick}, direction={(goForward ? "next" : "prev")})");
            currentPage = boundaryPage;
            break;
          }

          Console.WriteLine(
            $"[Construction] Failed to click page navigation button (attempt {attempts}, click {i + 1}/{stepsToClick}, direction={(goForward ? "next" : "prev")})");
          return null;
        }
      }
      else {
        Console.WriteLine($"[Construction] Navigate attempt {attempts}: diff=0, validating current page");
      }

      // Step 2: validate target page by image
      var targetCorrect = await NavigationConstruction.IsPageCorrect(targetPage, ct);
      if (targetCorrect) {
        Console.WriteLine($"[Construction] Target page image matched (target={targetPage}, attempt={attempts})");
        return targetPage;
      }

      Console.WriteLine(
        $"[Construction] Target page image not matched (target={targetPage}, attempt={attempts}), re-detecting...");

      // Step 3: re-detect actual page and loop again if needed
      var detectedPage = await DetectCurrentPage(ct);
      if (detectedPage.HasValue) {
        Console.WriteLine($"[Construction] Detected current page={detectedPage.Value} after attempt {attempts}");
        currentPage = detectedPage.Value;
      }
      else {
        // Best-effort guess if detection fails
        Console.WriteLine($"[Construction] Detection failed after attempt {attempts}, guessing current page from diff");
        currentPage += diff == 0 ? 0 : Math.Sign(diff);
      }
    }

    Console.WriteLine(
      $"[Construction] Unable to reach target page {targetPage}, last detected {currentPage}, attempts={attempts}");
    return null;
  }

  private static int CalculateSparePage(int yPosition) {
    return (yPosition / BoardOptimizer.SPARE_ROWS) + 1;
  }

  private static int CalculateSpareLocalY(int yPosition) {
    return yPosition % BoardOptimizer.SPARE_ROWS;
  }

  private static async Task<bool> PrepareConstructionInterface(CancellationToken ct) {
    // Open Cogs tab (will open Construction as fallback if needed)
    var cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
    if (!cogsTabOpened) {
      return false;
    }

    // Ensure trash is closed
    var trashClosed = await NavigationConstruction.EnsureTrashClosed(ct);
    if (!trashClosed) {
      return false;
    }

    // Ensure shelf is closed
    var shelfClosed = await NavigationConstruction.EnsureShelfClosed(ct);
    if (!shelfClosed) {
      return false;
    }

    // Ensure we're on first page
    return await NavigationConstruction.EnsureFirstPage(ct);
  }

  public static async Task<bool> ApplyBoard(string source, CancellationToken ct) {
    try {
      Console.WriteLine("[Construction] ApplyBoard started");

      // Prepare construction interface
      var prepared = await PrepareConstructionInterface(ct);
      if (!prepared) {
        Console.WriteLine("[Construction] Preparation failed");
        return false;
      }

      var inventory = BoardOptimizer.GetInventory(source);
      if (inventory == null) {
        Console.WriteLine("[Construction] No optimized inventory found");
        return false;
      }

      // Track working state to use up-to-date positions for each step
      var workingInventory = BoardOptimizer.GetInitialInventory(source);
      if (workingInventory == null) {
        Console.WriteLine("[Construction] No initial inventory found for tracking");
        return false;
      }

      // Get optimized steps
      var steps = Steps.GetOptimalSteps(inventory.Cogs, ct);

      Console.WriteLine($"[Construction] Steps to apply: {steps.Count}");

      var currentPage = 1;

      for (var stepIndex = 0; stepIndex < steps.Count; stepIndex++) {
        var step = steps[stepIndex];
        ct.ThrowIfCancellationRequested();

        // Resolve current positions using working inventory (to avoid stale coordinates after swaps)
        int? pos1Page = null;
        int? pos2Page = null;
        var sourceCog = workingInventory.Cogs.Values.FirstOrDefault(c => c.InitialKey == step.Cog.InitialKey);
        if (sourceCog == null) {
          Console.WriteLine($"[Construction] Missing source cog for initialKey={step.Cog.InitialKey}");
          return false;
        }

        var currentFromKey = sourceCog.Key;
        var pos1 = sourceCog.Position();

        // Target position based on desired key
        var targetPosCog = workingInventory.Get(step.KeyTo);
        var pos2 = targetPosCog.Position(step.KeyTo);

        Point startCoords = new(), endCoords = new();

        switch (pos1.Location) {
          // Handle source cog
          case "board":
            startCoords = CalculateCoords(pos1.Location, new Point(pos1.X, pos1.Y));
            break;
          case "spare": {
            var targetPage = CalculateSparePage(pos1.Y);
            var localY = CalculateSpareLocalY(pos1.Y);
            var localPos = new Point(pos1.X, localY);

            pos1Page = targetPage;
            // Navigate to the correct page if needed
            if (currentPage != targetPage) {
              var navigatedPage = await NavigateToPage(targetPage, currentPage, ct);
              if (!navigatedPage.HasValue) {
                return false;
              }

              currentPage = navigatedPage.Value;
            }

            startCoords = CalculateCoords("spare", localPos);
            break;
          }
        }

        switch (pos2.Location) {
          // Handle target cog
          case "board":
            endCoords = CalculateCoords(pos2.Location, new Point(pos2.X, pos2.Y));
            break;
          case "spare": {
            var targetPage = CalculateSparePage(pos2.Y);
            var localY = CalculateSpareLocalY(pos2.Y);
            var localPos = new Point(pos2.X, localY);

            pos2Page = targetPage;
            // Navigate to the correct page if needed
            if (currentPage != targetPage) {
              var navigatedPage = await NavigateToPage(targetPage, currentPage, ct);
              if (!navigatedPage.HasValue) {
                return false;
              }

              currentPage = navigatedPage.Value;
            }

            endCoords = CalculateCoords("spare", localPos);
            break;
          }
        }

        Console.WriteLine(
          $"[Construction] STEP {stepIndex + 1}/{steps.Count}: " +
          $"{FormatLocation(pos1.Location, pos1.X, pos1.Y, pos1Page)} TO " +
          $"{FormatLocation(pos2.Location, pos2.X, pos2.Y, pos2Page)}"
        );

        // Perform drag operation
        await MouseSimulator.Drag(startCoords, endCoords, ct);

        // Update working inventory to keep positions in sync for subsequent steps
        workingInventory.Move(currentFromKey, step.KeyTo);

        // Log post-move expected vs working positions for the two cogs involved
        var srcAfter = workingInventory.Get(step.KeyTo); // now at target
        var dstAfter = workingInventory.Get(currentFromKey); // what is now at source slot
        var srcPosAfter = srcAfter.Position();
        var dstPosAfter = dstAfter.Position();
        Console.WriteLine(
          $"[Construction] Post-move: moved initial={step.Cog.InitialKey} now at {srcPosAfter.Location}({srcPosAfter.X},{srcPosAfter.Y}); " +
          $"slot {currentFromKey} now holds initial={dstAfter.InitialKey} at {dstPosAfter.Location}({dstPosAfter.X},{dstPosAfter.Y})"
        );
      }

      Console.WriteLine("[Construction] ApplyBoard finished");
      return true;
    }
    catch (Exception ex) {
      Console.WriteLine($"[Construction] ApplyBoard exception: {ex.Message}");
      return false;
    }
  }
}

