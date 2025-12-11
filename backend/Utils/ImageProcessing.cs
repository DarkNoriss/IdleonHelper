using System.Diagnostics;
using OpenCvSharp;
using Point = System.Drawing.Point;

namespace IdleonHelperBackend.Utils;

public static class ImageProcessing {
  public const int DEFAULT_IMAGE_INTERVAL_MS = 50;
  public const int DEFAULT_IMAGE_TIMEOUT_MS = 5000;
  public const double DEFAULT_IMAGE_THRESHOLD = 0.90;

  public record ScreenOffset(
    int Left = 0,
    int Right = 0,
    int Top = 0,
    int Bottom = 0
  );

  public static async Task<List<Point>> FindAsync(
    Mat templateImage,
    CancellationToken ct,
    int timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS,
    int intervalMs = DEFAULT_IMAGE_INTERVAL_MS,
    double threshold = DEFAULT_IMAGE_THRESHOLD,
    ScreenOffset? offset = null,
    bool debug = false
  ) {
    ct.ThrowIfCancellationRequested();

    if (templateImage.Empty()) {
      throw new ArgumentException("Template image cannot be null or empty", nameof(templateImage));
    }

    if (threshold is < 0.0 or > 1.0) {
      throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0.0 and 1.0");
    }

    offset ??= new ScreenOffset();
    List<Point> matches = [];
    var stopwatch = Stopwatch.StartNew();
    var timeoutSeconds = timeoutMs / 1000.0;

    while (stopwatch.Elapsed.TotalSeconds < timeoutSeconds) {
      ct.ThrowIfCancellationRequested();

      using var screenshot = WindowCapture.CaptureScreenShot(ct);
      var foundMatches = MatchTemplate(screenshot, templateImage, ct, threshold, debug);

      var filteredMatches = FilterMatchesByOffset(foundMatches, offset);
      matches.AddRange(filteredMatches);

      if (matches.Count > 0) {
        break;
      }

      var delayMs = timeoutMs < intervalMs ? timeoutMs : intervalMs;
      await Task.Delay(delayMs, ct);
    }

    return matches;
  }


  public static Mat LoadImage(string imagePath) {
    if (!File.Exists(imagePath)) {
      throw new FileNotFoundException($"Image file not found: {imagePath}", imagePath);
    }

    return Cv2.ImRead(imagePath, ImreadModes.Grayscale);
  }


  private static List<Point> MatchTemplate(
    Mat screenshot,
    Mat templateImage,
    CancellationToken ct,
    double threshold,
    bool debug = false
  ) {
    ct.ThrowIfCancellationRequested();

    if (screenshot.Width < templateImage.Width || screenshot.Height < templateImage.Height) {
      return [];
    }

    using var result = new Mat();
    Cv2.MatchTemplate(screenshot, templateImage, result, TemplateMatchModes.CCoeffNormed);

    if (debug) {
      Cv2.MinMaxLoc(result, out _, out var maxVal, out _, out _);
      Console.WriteLine(
        $"[ImageProcessing] MatchTemplate debug: max correlation={maxVal:P2}, threshold={threshold:P2}");
    }

    using var binaryResult = new Mat();
    Cv2.Threshold(result, binaryResult, threshold, 1.0, ThresholdTypes.Binary);

    using var nonZeroCoordinates = new Mat();
    Cv2.FindNonZero(binaryResult, nonZeroCoordinates);

    var templateSize = templateImage.Size();
    var halfWidth = templateSize.Width / 2;
    var halfHeight = templateSize.Height / 2;

    List<Point> matches = [];

    for (var i = 0; i < nonZeroCoordinates.Rows; i++) {
      ct.ThrowIfCancellationRequested();

      var cvPoint = nonZeroCoordinates.At<Point>(i);
      matches.Add(new Point(cvPoint.X + halfWidth, cvPoint.Y + halfHeight));
    }

    return matches;
  }

  private static List<Point> FilterMatchesByOffset(List<Point> matches,
    ScreenOffset offset) {
    return matches.Where(match => {
      var isWithinHorizontal =
        (offset.Left == 0 || match.X >= offset.Left) &&
        (offset.Right == 0 || match.X <= offset.Right);

      var isWithinVertical =
        (offset.Top == 0 || match.Y >= offset.Top) &&
        (offset.Bottom == 0 || match.Y <= offset.Bottom);

      return isWithinHorizontal && isWithinVertical;
    }).ToList();
  }

  public static async Task<(List<Point> matches, string? debugImagePath)> FindWithDebugImageAsync(
    string templateImagePath,
    CancellationToken ct,
    int timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS,
    int intervalMs = DEFAULT_IMAGE_INTERVAL_MS,
    double threshold = DEFAULT_IMAGE_THRESHOLD,
    ScreenOffset? offset = null,
    bool saveDebugImage = true,
    string? debugFileName = null
  ) {
    ct.ThrowIfCancellationRequested();

    var template = LoadImage(templateImagePath);
    var matches = await FindAsync(template, ct, timeoutMs, intervalMs, threshold, offset, debug: saveDebugImage);

    string? debugPath = null;

    if (!saveDebugImage || matches.Count <= 0) return (matches, debugPath);

    using var screenshotGray = WindowCapture.CaptureScreenShot(ct);
    using var screenshotColor = new Mat();
    Cv2.CvtColor(screenshotGray, screenshotColor, ColorConversionCodes.GRAY2BGR);

    var templateSize = template.Size();
    for (var i = 0; i < matches.Count; i++) {
      var p = matches[i];
      var x = Math.Clamp(p.X - templateSize.Width / 2, 0, screenshotColor.Width - templateSize.Width);
      var y = Math.Clamp(p.Y - templateSize.Height / 2, 0, screenshotColor.Height - templateSize.Height);
      var rect = new Rect(x, y, templateSize.Width, templateSize.Height);

      Console.WriteLine($"[ImageProcessing] Debug: index={i}, point={p}");

      Cv2.Rectangle(screenshotColor, rect, new Scalar(0, 0, 255), 2);
      Cv2.PutText(
        screenshotColor,
        i.ToString(),
        new OpenCvSharp.Point(x, y - 4),
        HersheyFonts.HersheySimplex,
        0.5,
        new Scalar(0, 0, 255)
      );
    }

    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmssfff");
    var baseName = Path.GetFileNameWithoutExtension(templateImagePath);
    debugFileName ??= $"annotated-{baseName}-{timestamp}.png";
    debugPath = Path.Combine(AppContext.BaseDirectory, debugFileName);
    Cv2.ImWrite(debugPath, screenshotColor);

    return (matches, debugPath);
  }
}

