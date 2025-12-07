namespace IdleonBotBackend.Utils;

/// <summary>
/// Navigation functionality for UI elements (menus, buttons, etc.).
/// </summary>
public static class NavigationUI {
  /// <summary>
  /// Opens the Codex menu. Verifies it's actually open by checking for quick-ref inside it.
  /// If the first click closes something else instead, it will click again.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding Codex (default: 100ms)</param>
  /// <returns>True if Codex was opened successfully, false otherwise</returns>
  public static async Task<bool> OpenCodex(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    // First attempt to click Codex
    bool clicked = await Navigation.NavigateTo("ui/codex.png", ct, null, timeoutMs);
    if (!clicked) {
      return false;
    }

    // Verify Codex is open by checking for quick-ref (which is inside Codex)
    bool isOpen = await Navigation.IsVisible("quik-ref/quick-ref.png", ct);
    
    if (!isOpen) {
      // Codex wasn't actually opened (probably closed something else), try clicking again
      clicked = await Navigation.NavigateTo("ui/codex.png", ct, null, timeoutMs);
      if (!clicked) {
        return false;
      }

      // Verify again
      isOpen = await Navigation.IsVisible("quik-ref/quick-ref.png", ct);
    }

    return isOpen;
  }

  /// <summary>
  /// Opens the Quick-Ref menu. Will attempt to open Codex first if Quick-Ref is not found.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding Quick-Ref (default: 100ms)</param>
  /// <returns>True if Quick-Ref was opened successfully, false otherwise</returns>
  public static async Task<bool> OpenQuickRef(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    return await Navigation.NavigateTo(
      "quik-ref/quick-ref.png",
      ct,
      fallback: (cancellationToken) => OpenCodex(cancellationToken, timeoutMs),
      timeoutMs: timeoutMs
    );
  }
}

