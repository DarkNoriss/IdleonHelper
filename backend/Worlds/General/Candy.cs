using IdleonHelperBackend.Navigation;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Worlds.General;

public record CandyResult(bool Success, string Message);

public static class Candy {
  public static async Task<CandyResult> StartAsync(CancellationToken cancellationToken) {
    // Open items at the start
    var itemsOpened = await NavigationUi.OpenItems(cancellationToken);
    if (!itemsOpened) {
      return new CandyResult(false, "Failed to open items");
    }

    while (true) {
      cancellationToken.ThrowIfCancellationRequested();

      // Confirm items is open (equips.png visible)
      var itemsOpen = await UiInteraction.IsVisible("items/equips.png", cancellationToken);
      if (!itemsOpen) {
        // Try to reopen items
        itemsOpened = await NavigationUi.OpenItems(cancellationToken);
        if (!itemsOpened) {
          return new CandyResult(false, "Failed to reopen items");
        }
      }

      // Find and click candy.png with 1 second hold time
      var candyFound = await UiInteraction.FindAndClick("general/candy.png", cancellationToken, holdTimeMs: 1000);
      if (!candyFound) {
        return new CandyResult(false, "Candy not found");
      }

      // Check if storage.png is visible
      var storageVisible = await UiInteraction.IsVisible("general/storage.png", cancellationToken);
      if (storageVisible) {
        await UiInteraction.FindAndClick("general/storage.png", cancellationToken);
      }
      else {
        // If storage not visible, find and click claim
        await UiInteraction.FindAndClick("general/claim.png", cancellationToken);
      }

      // Go back to items for next iteration
      await NavigationUi.OpenItems(cancellationToken);

      // Small delay before next iteration
      await Task.Delay(500, cancellationToken);
    }
  }
}
