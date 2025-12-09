using System.Drawing;
using OpenCvSharp;

namespace IdleonHelperBackend.Utils;

/// <summary>
/// Base navigation functionality for finding and clicking UI elements with fallback support.
/// </summary>
public static class Navigation {
  public const int DEFAULT_TIMEOUT_MS = 100; // Quick check - image should be there or not

  /// <summary>
  /// Gets the base path for assets. Tries multiple locations to support both development and production.
  /// </summary>
  public static string GetAssetsBasePath() {
    // Try current directory first (for development)
    string devPath = Path.Combine(Directory.GetCurrentDirectory(), "Assets");
    if (Directory.Exists(devPath)) {
      return devPath;
    }

    // Try base directory (for production)
    string basePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets");
    if (Directory.Exists(basePath)) {
      return basePath;
    }

    // Fallback to base directory even if it doesn't exist (will throw FileNotFoundException later)
    return basePath;
  }

  /// <summary>
  /// Navigates to a target by finding and clicking its image.
  /// If the target is not found, executes the fallback navigation action.
  /// </summary>
  /// <param name="imagePath">Path to the target image relative to Assets folder</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="fallback">Optional fallback navigation action if target is not found</param>
  /// <param name="timeoutMs">Timeout for finding the image (default: 100ms)</param>
  /// <param name="clickInterval">Delay between clicks in milliseconds (default: MOUSE_CLICK_DELAY)</param>
  /// <param name="threshold">Matching threshold (default: 0.9)</param>
  /// <returns>True if navigation was successful, false otherwise</returns>
  public static async Task<bool> NavigateTo(
    string imagePath,
    CancellationToken ct,
    Func<CancellationToken, Task<bool>>? fallback = null,
    int timeoutMs = DEFAULT_TIMEOUT_MS,
    int? clickInterval = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    string fullPath = GetAssetPath(imagePath);
    if (!File.Exists(fullPath)) {
      throw new FileNotFoundException($"Navigation image not found: {fullPath}", fullPath);
    }
    
    using Mat template = ImageProcessing.LoadImage(fullPath);
    var matches = await ImageProcessing.FindAsync(
      template,
      ct,
      timeoutMs: timeoutMs,
      threshold: threshold
    );

    if (matches.Count > 0) {
      // Click the first match
      int interval = clickInterval ?? MouseSimulator.MOUSE_CLICK_DELAY;
      await MouseSimulator.Click(matches[0], ct, times: 1, interval: interval);
      return true;
    }

    // Target not found, try fallback if provided
    if (fallback != null) {
      bool fallbackSuccess = await fallback(ct);
      if (fallbackSuccess) {
        // Retry navigation after fallback
        return await NavigateTo(imagePath, ct, null, timeoutMs, clickInterval, threshold);
      }
    }

    return false;
  }

  /// <summary>
  /// Navigates through a chain of targets, ensuring each step is completed before proceeding.
  /// </summary>
  /// <param name="navigationChain">Array of image paths to navigate through in order</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for each navigation step (default: 100ms)</param>
  /// <param name="threshold">Matching threshold (default: 0.9)</param>
  /// <returns>True if entire chain was navigated successfully, false otherwise</returns>
  public static async Task<bool> NavigateChain(
    string[] navigationChain,
    CancellationToken ct,
    int timeoutMs = DEFAULT_TIMEOUT_MS,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    if (navigationChain == null || navigationChain.Length == 0) {
      return false;
    }

    for (int i = 0; i < navigationChain.Length; i++) {
      ct.ThrowIfCancellationRequested();

      string imagePath = navigationChain[i];
      bool success = await NavigateTo(imagePath, ct, null, timeoutMs, null, threshold: threshold);

      if (!success) {
        // If this step failed and it's not the first step, try navigating from the beginning
        if (i > 0) {
          return await NavigateChain(navigationChain, ct, timeoutMs, threshold: threshold);
        }
        return false;
      }
    }

    return true;
  }

  /// <summary>
  /// Gets the full path to an asset file.
  /// </summary>
  /// <param name="relativePath">Path relative to Assets folder (e.g., "ui/codex.png")</param>
  /// <returns>Full path to the asset file</returns>
  public static string GetAssetPath(string relativePath) {
    return Path.Combine(GetAssetsBasePath(), relativePath);
  }

  /// <summary>
  /// Checks if a navigation target is currently visible on screen.
  /// </summary>
  /// <param name="imagePath">Path to the target image relative to Assets folder</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Timeout for finding the image (default: 1000ms)</param>
  /// <param name="threshold">Matching threshold (default: 0.9)</param>
  /// <returns>True if the target is visible, false otherwise</returns>
  public static async Task<bool> IsVisible(
    string imagePath,
    CancellationToken ct,
    int timeoutMs = DEFAULT_TIMEOUT_MS,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    string fullPath = GetAssetPath(imagePath);
    if (!File.Exists(fullPath)) {
      return false;
    }

    using Mat template = ImageProcessing.LoadImage(fullPath);
    var matches = await ImageProcessing.FindAsync(
      template,
      ct,
      timeoutMs: timeoutMs,
      threshold: threshold
    );

    return matches.Count > 0;
  }
}
