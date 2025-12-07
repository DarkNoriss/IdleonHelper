namespace IdleonBotBackend.Utils;

/// <summary>
/// Navigation functionality for UI elements (menus, buttons, etc.).
/// </summary>
public static class NavigationUI {
  /// <summary>
  /// Opens the Codex menu.
  /// </summary>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding Codex (default: 100ms)</param>
  /// <returns>True if Codex was opened successfully, false otherwise</returns>
  public static async Task<bool> OpenCodex(
    CancellationToken ct,
    int timeoutMs = Navigation.DEFAULT_TIMEOUT_MS
  ) {
    return await Navigation.NavigateTo("ui/codex.png", ct, null, timeoutMs);
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

