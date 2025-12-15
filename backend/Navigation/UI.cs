using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Navigation;

public static class NavigationUi {
  public static async Task<bool> OpenCodex(CancellationToken ct) {
    // Check if codex is already open
    var isOpen = await UiInteraction.IsVisible("quik-ref/quick-ref.png", ct);
    if (isOpen) return true;

    var clicked = await UiInteraction.NavigateTo("ui/codex.png", ct);
    if (!clicked) return false;

    isOpen = await UiInteraction.IsVisible("quik-ref/quick-ref.png", ct);

    if (isOpen) return isOpen;

    clicked = await UiInteraction.NavigateTo("ui/codex.png", ct);
    if (!clicked) return false;

    return await UiInteraction.IsVisible("quik-ref/quick-ref.png", ct);
  }

  public static async Task<bool> OpenQuickRef(CancellationToken ct) {
    return await UiInteraction.NavigateTo(
      "quik-ref/quick-ref.png",
      ct,
      fallback: OpenCodex
    );
  }

  public static async Task<bool> OpenItems(CancellationToken ct) {
    Console.WriteLine("[NavigationUi] Attempting to open items...");

    // Check if items is already open
    Console.WriteLine("[NavigationUi] Step 0: Checking if items is already open...");
    var isOpen = await UiInteraction.IsVisible("items/lock.png", ct);
    if (isOpen) {
      Console.WriteLine("[NavigationUi] Items already open (lock.png visible)");
      return true;
    }

    Console.WriteLine("[NavigationUi] Step 1: Looking for ui/items.png");
    var clicked = await UiInteraction.NavigateTo("ui/items.png", ct);
    if (!clicked) {
      Console.WriteLine("[NavigationUi] ERROR: Failed to find/click ui/items.png on first attempt");
      return false;
    }

    Console.WriteLine("[NavigationUi] Successfully clicked ui/items.png");

    // Wait a bit for UI to transition
    await Task.Delay(300, ct);

    Console.WriteLine("[NavigationUi] Step 2: Checking for confirmation (items/lock.png)...");
    isOpen = await UiInteraction.IsVisible("items/lock.png", ct);
    if (isOpen) {
      Console.WriteLine("[NavigationUi] Items confirmed open (lock.png visible)");
      return true;
    }

    Console.WriteLine("[NavigationUi] Items not confirmed open, attempting retry...");

    Console.WriteLine("[NavigationUi] Step 3: Retry - Looking for ui/items.png again");
    clicked = await UiInteraction.NavigateTo("ui/items.png", ct, debug: true);
    if (!clicked) {
      Console.WriteLine("[NavigationUi] ERROR: Failed to find/click ui/items.png on retry attempt");
      return false;
    }

    Console.WriteLine("[NavigationUi] Successfully clicked ui/items.png on retry");

    // Wait a bit for UI to transition
    await Task.Delay(300, ct);

    Console.WriteLine("[NavigationUi] Step 4: Checking for confirmation again (items/lock.png)...");
    var isOpenRetry = await UiInteraction.IsVisible("items/lock.png", ct);
    if (isOpenRetry) {
      Console.WriteLine("[NavigationUi] Items confirmed open after retry (lock.png visible)");
      return true;
    }

    Console.WriteLine("[NavigationUi] ERROR: Items still not confirmed open after retry");
    return false;
  }
}
