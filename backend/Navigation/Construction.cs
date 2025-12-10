using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Navigation;

public static class NavigationConstruction {
  public static async Task<bool> OpenConstruction(CancellationToken ct) {
    return await UiInteraction.NavigateTo("quik-ref/construction.png", ct, fallback: NavigationUi.OpenQuickRef);
  }

  public static async Task<bool> OpenCogsTab(CancellationToken ct) {
    return await UiInteraction.NavigateTo("construction/cogs_tab.png", ct, fallback: OpenConstruction);
  }

  public static async Task<bool> EnsureTrashClosed(CancellationToken ct) {
    if (await UiInteraction.IsVisible("construction/cogs-trash-off.png", ct)) return true;

    return await UiInteraction.FindAndClick("construction/cogs-trash.png", ct);
  }

  public static async Task<bool> EnsureTrashOpen(CancellationToken ct) {
    if (await UiInteraction.IsVisible("construction/cogs-trash.png", ct)) return true;
    return await UiInteraction.FindAndClick("construction/cogs-trash-off.png", ct);
  }

  public static async Task<bool> EnsureShelfClosed(CancellationToken ct) {
    if (await UiInteraction.IsVisible("construction/cogs-shelf-off.png", ct)) return true;
    return await UiInteraction.FindAndClick("construction/cogs-shelf.png", ct);
  }

  public static async Task<bool> EnsureShelfOpen(CancellationToken ct) {
    if (await UiInteraction.IsVisible("construction/cogs-shelf.png", ct)) return true;
    return await UiInteraction.FindAndClick("construction/cogs-shelf-off.png", ct);
  }

  public static async Task<bool> EnsureFirstPage(CancellationToken ct) {
    const int maxAttempts = 10;
    var attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      if (await UiInteraction.IsVisible("construction/cogs-page-prev-off.png", ct)) return true;
      var clicked = await UiInteraction.FindAndClick("construction/cogs-page-prev.png", ct, times: 10);
      if (clicked) return true;
    }

    return false;
  }

  public static async Task<bool> EnsureLastPage(CancellationToken ct) {
    const int maxAttempts = 10;
    var attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      if (await UiInteraction.IsVisible("construction/cogs-page-next-off.png", ct)) return true;
      var clicked = await UiInteraction.FindAndClick("construction/cogs-page-next.png", ct, times: 10);
      if (clicked) return true;
    }

    return false;
  }

  public static async Task<bool> IsPageCorrect(int page, CancellationToken ct, bool debug = false) {
    return await UiInteraction.IsVisible($"construction/page-{page}.png", ct, threshold: 0.985, debug: debug);
  }
}