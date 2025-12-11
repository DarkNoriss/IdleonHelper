using OpenCvSharp;
using Point = System.Drawing.Point;

namespace IdleonHelperBackend.Utils;

public static class UiInteraction {
  private const int FAST_VISIBLE_TIMEOUT_MS = 100;

  public static async Task<bool> FindAndClick(
    string imagePath,
    CancellationToken ct,
    int? timeoutMs = null,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    int times = 1,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();
    using var template = LoadTemplate(imagePath);
    var matches = await ImageProcessing.FindAsync(
      template,
      ct,
      timeoutMs: timeoutMs ?? ImageProcessing.DEFAULT_IMAGE_TIMEOUT_MS,
      intervalMs: intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      offset: offset,
      threshold: threshold
    );

    if (matches.Count == 0) {
      return false;
    }

    await MouseSimulator.Click(matches[0], ct, times);
    return true;
  }

  public static async Task<(List<Point> matches, string? debugImagePath)> FindWithDebugImage(
    string imagePath,
    CancellationToken ct,
    int? timeoutMs = null,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD,
    bool saveDebugImage = true,
    string? debugFileName = null
  ) {
    var fullPath = Navigation.GetAssetPath(imagePath);
    return await ImageProcessing.FindWithDebugImageAsync(
      fullPath,
      ct,
      timeoutMs ?? ImageProcessing.DEFAULT_IMAGE_TIMEOUT_MS,
      intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      threshold,
      offset,
      saveDebugImage,
      debugFileName
    );
  }

  public static async Task<List<Point>> Find(
    string imagePath,
    CancellationToken ct,
    int? timeoutMs = null,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD,
    bool debug = false
  ) {
    ct.ThrowIfCancellationRequested();
    using var template = LoadTemplate(imagePath);
    return await ImageProcessing.FindAsync(
      template,
      ct,
      timeoutMs: timeoutMs ?? ImageProcessing.DEFAULT_IMAGE_TIMEOUT_MS,
      intervalMs: intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      offset: offset,
      threshold: threshold,
      debug: debug
    );
  }

  public static async Task<List<Point>> GetVisiblePoints(
    string imagePath,
    CancellationToken ct,
    int timeoutMs = FAST_VISIBLE_TIMEOUT_MS,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD,
    bool debug = false
  ) {
    ct.ThrowIfCancellationRequested();
    return await Find(
      imagePath,
      ct,
      timeoutMs,
      intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      offset,
      threshold,
      debug
    );
  }

  public static async Task<bool> IsVisible(
    string imagePath,
    CancellationToken ct,
    int timeoutMs = FAST_VISIBLE_TIMEOUT_MS,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD,
    bool debug = false
  ) {
    var matches = await GetVisiblePoints(
      imagePath,
      ct,
      timeoutMs,
      intervalMs,
      offset,
      threshold,
      debug
    );
    return matches.Count > 0;
  }

  public static async Task<bool> NavigateTo(
    string imagePath,
    CancellationToken ct,
    Func<CancellationToken, Task<bool>>? fallback = null,
    int? timeoutMs = null,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    int times = 1,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD,
    bool debug = false
  ) {
    ct.ThrowIfCancellationRequested();

    var matches = await GetVisiblePoints(
      imagePath,
      ct,
      timeoutMs ?? FAST_VISIBLE_TIMEOUT_MS,
      intervalMs,
      offset,
      threshold,
      debug
    );

    if (matches.Count > 0) {
      await MouseSimulator.Click(
        matches[0],
        ct,
        times,
        intervalMs ?? MouseSimulator.MOUSE_CLICK_DELAY
      );
      return true;
    }

    if (fallback == null) {
      return false;
    }

    var fallbackSucceeded = await fallback(ct);
    if (!fallbackSucceeded) {
      return false;
    }

    matches = await GetVisiblePoints(
      imagePath,
      ct,
      timeoutMs ?? FAST_VISIBLE_TIMEOUT_MS,
      intervalMs,
      offset,
      threshold
    );

    if (matches.Count == 0) {
      return false;
    }

    await MouseSimulator.Click(
      matches[0],
      ct,
      times,
      intervalMs ?? MouseSimulator.MOUSE_CLICK_DELAY
    );
    return true;
  }

  private static Mat LoadTemplate(string imagePath) {
    var fullPath = Navigation.GetAssetPath(imagePath);
    return ImageProcessing.LoadImage(fullPath);
  }
}

