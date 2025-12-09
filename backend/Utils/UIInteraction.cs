using System.Drawing;
using IdleonHelperBackend.Utils;
using OpenCvSharp;
using Point = System.Drawing.Point;

namespace IdleonHelperBackend.Utils;

public static class UIInteraction {
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
    using Mat template = LoadTemplate(imagePath);
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

  public static async Task<List<Point>> Find(
    string imagePath,
    CancellationToken ct,
    int? timeoutMs = null,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();
    using Mat template = LoadTemplate(imagePath);
    return await ImageProcessing.FindAsync(
      template,
      ct,
      timeoutMs: timeoutMs ?? ImageProcessing.DEFAULT_IMAGE_TIMEOUT_MS,
      intervalMs: intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      offset: offset,
      threshold: threshold
    );
  }

  public static async Task<bool> IsVisible(
    string imagePath,
    CancellationToken ct,
    int timeoutMs = FAST_VISIBLE_TIMEOUT_MS,
    int? intervalMs = null,
    ImageProcessing.ScreenOffset? offset = null,
    double threshold = ImageProcessing.DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();
    var matches = await Find(
      imagePath,
      ct,
      timeoutMs,
      intervalMs ?? ImageProcessing.DEFAULT_IMAGE_INTERVAL_MS,
      offset,
      threshold
    );
    return matches.Count > 0;
  }

  public static Task Click(
    Point point,
    CancellationToken ct,
    int times = 1,
    int interval = MouseSimulator.MOUSE_CLICK_DELAY
  ) => MouseSimulator.Click(point, ct, times, interval);

  public static Task Click(
    List<Point> points,
    CancellationToken ct,
    int times = 1,
    int interval = MouseSimulator.MOUSE_CLICK_DELAY
  ) => MouseSimulator.Click(points, ct, times, interval);

  private static Mat LoadTemplate(string imagePath) {
    string fullPath = Navigation.GetAssetPath(imagePath);
    return ImageProcessing.LoadImage(fullPath);
  }
}

