using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Navigation;

public static class NavigationUi {
  public static async Task<bool> OpenCodex(CancellationToken ct) {
    var clicked = await UiInteraction.NavigateTo("ui/codex.png", ct);
    if (!clicked) return false;

    var isOpen = await UiInteraction.IsVisible("quik-ref/quick-ref.png", ct);

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
}
