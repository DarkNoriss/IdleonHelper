using System.Diagnostics;
using System.Drawing;
using OpenCvSharp;

namespace IdleonHelperBackend.Utils;

/// <summary>
/// Provides methods for finding images on screen using template matching and performing actions on them.
/// </summary>
public static class ImageProcessing {
  public const int DEFAULT_IMAGE_INTERVAL_MS = 50;
  public const int DEFAULT_IMAGE_TIMEOUT_MS = 5000;
  public const double DEFAULT_IMAGE_THRESHOLD = 0.9;

  /// <summary>
  /// Represents screen offset boundaries for filtering search results.
  /// Zero values indicate no boundary restriction in that direction.
  /// </summary>
  public record ScreenOffset(
    int Left = 0,
    int Right = 0,
    int Top = 0,
    int Bottom = 0
  );

  /// <summary>
  /// Finds all occurrences of a template image on the screen within the specified timeout.
  /// </summary>
  /// <param name="templateImage">The template image to search for (grayscale Mat)</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Maximum time to search in milliseconds (default: 5000)</param>
  /// <param name="intervalMs">Delay between search attempts in milliseconds (default: 50)</param>
  /// <param name="offset">Screen offset boundaries to filter results (default: no restrictions)</param>
  /// <param name="threshold">Matching threshold between 0.0 and 1.0 (default: 0.9)</param>
  /// <returns>List of matching point coordinates (centers of matched regions)</returns>
  public static async Task<List<System.Drawing.Point>> FindAsync(
    Mat templateImage,
    CancellationToken ct,
    int timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS,
    int intervalMs = DEFAULT_IMAGE_INTERVAL_MS,
    ScreenOffset? offset = null,
    double threshold = DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    if (templateImage == null || templateImage.Empty()) {
      throw new ArgumentException("Template image cannot be null or empty", nameof(templateImage));
    }

    if (threshold < 0.0 || threshold > 1.0) {
      throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0.0 and 1.0");
    }

    offset ??= new ScreenOffset();
    List<System.Drawing.Point> matches = [];
    Stopwatch stopwatch = Stopwatch.StartNew();
    double timeoutSeconds = timeoutMs / 1000.0;

    while (stopwatch.Elapsed.TotalSeconds < timeoutSeconds) {
      ct.ThrowIfCancellationRequested();

      using Mat screenshot = WindowCapture.CaptureScreenShot(ct);
      List<System.Drawing.Point> foundMatches = MatchTemplate(screenshot, templateImage, ct, threshold);

      var filteredMatches = FilterMatchesByOffset(foundMatches, offset);
      matches.AddRange(filteredMatches);

      if (matches.Count > 0) {
        break;
      }

      int delayMs = timeoutMs < intervalMs ? timeoutMs : intervalMs;
      await Task.Delay(delayMs, ct);
    }

    return matches;
  }

  /// <summary>
  /// Finds an image on screen and clicks on all found occurrences.
  /// </summary>
  /// <param name="templateImage">The template image to search for (grayscale Mat)</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Maximum time to search in milliseconds (default: 5000)</param>
  /// <param name="intervalMs">Delay between search attempts in milliseconds (default: 50)</param>
  /// <param name="offset">Screen offset boundaries to filter results (default: no restrictions)</param>
  /// <param name="times">Number of times to click each found location (default: 1)</param>
  /// <param name="threshold">Matching threshold between 0.0 and 1.0 (default: 0.9)</param>
  /// <returns>Number of matches found and clicked</returns>
  public static async Task<int> FindAndClickAsync(
    Mat templateImage,
    CancellationToken ct,
    int timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS,
    int intervalMs = DEFAULT_IMAGE_INTERVAL_MS,
    ScreenOffset? offset = null,
    int times = 1,
    double threshold = DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    var matches = await FindAsync(templateImage, ct, timeoutMs, intervalMs, offset, threshold);

    if (matches.Count == 0) {
      return 0;
    }

    await MouseSimulator.Click(matches, ct, times);
    return matches.Count;
  }

  /// <summary>
  /// Finds an image on screen and clicks on the first occurrence only.
  /// </summary>
  /// <param name="templateImage">The template image to search for (grayscale Mat)</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="timeoutMs">Maximum time to search in milliseconds (default: 5000)</param>
  /// <param name="intervalMs">Delay between search attempts in milliseconds (default: 50)</param>
  /// <param name="offset">Screen offset boundaries to filter results (default: no restrictions)</param>
  /// <param name="times">Number of times to click the found location (default: 1)</param>
  /// <param name="threshold">Matching threshold between 0.0 and 1.0 (default: 0.9)</param>
  /// <returns>True if a match was found and clicked, false otherwise</returns>
  public static async Task<bool> FindAndClickFirstAsync(
    Mat templateImage,
    CancellationToken ct,
    int timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS,
    int intervalMs = DEFAULT_IMAGE_INTERVAL_MS,
    ScreenOffset? offset = null,
    int times = 1,
    double threshold = DEFAULT_IMAGE_THRESHOLD
  ) {
    ct.ThrowIfCancellationRequested();

    var matches = await FindAsync(templateImage, ct, timeoutMs, intervalMs, offset, threshold);

    if (matches.Count == 0) {
      return false;
    }

    await MouseSimulator.Click(matches[0], ct, times);
    return true;
  }

  /// <summary>
  /// Loads an image from file path as a grayscale Mat for template matching.
  /// </summary>
  /// <param name="imagePath">Path to the image file</param>
  /// <returns>Grayscale Mat ready for template matching</returns>
  /// <exception cref="FileNotFoundException">Thrown when the image file is not found</exception>
  public static Mat LoadImage(string imagePath) {
    if (!File.Exists(imagePath)) {
      throw new FileNotFoundException($"Image file not found: {imagePath}", imagePath);
    }

    return Cv2.ImRead(imagePath, ImreadModes.Grayscale);
  }

  /// <summary>
  /// Performs template matching to find occurrences of a template image in a screenshot.
  /// </summary>
  /// <param name="screenshot">The screenshot to search in (grayscale Mat)</param>
  /// <param name="templateImage">The template image to search for (grayscale Mat)</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="threshold">Matching threshold between 0.0 and 1.0</param>
  /// <returns>List of matching point coordinates (centers of matched regions)</returns>
  private static List<System.Drawing.Point> MatchTemplate(Mat screenshot, Mat templateImage, CancellationToken ct, double threshold) {
    ct.ThrowIfCancellationRequested();

    if (screenshot.Width < templateImage.Width || screenshot.Height < templateImage.Height) {
      return [];
    }

    using Mat result = new Mat();
    Cv2.MatchTemplate(screenshot, templateImage, result, TemplateMatchModes.CCoeffNormed);

    using Mat binaryResult = new Mat();
    Cv2.Threshold(result, binaryResult, threshold, 1.0, ThresholdTypes.Binary);

    using Mat nonZeroCoordinates = new Mat();
    Cv2.FindNonZero(binaryResult, nonZeroCoordinates);

    OpenCvSharp.Size templateSize = templateImage.Size();
    int halfWidth = templateSize.Width / 2;
    int halfHeight = templateSize.Height / 2;

    List<System.Drawing.Point> matches = [];

    for (int i = 0; i < nonZeroCoordinates.Rows; i++) {
      ct.ThrowIfCancellationRequested();

      var cvPoint = nonZeroCoordinates.At<OpenCvSharp.Point>(i);
      // Convert to center point of the matched region
      matches.Add(new System.Drawing.Point(cvPoint.X + halfWidth, cvPoint.Y + halfHeight));
    }

    return matches;
  }

  /// <summary>
  /// Filters matches based on screen offset boundaries.
  /// </summary>
  private static List<System.Drawing.Point> FilterMatchesByOffset(List<System.Drawing.Point> matches, ScreenOffset offset) {
    return matches.Where(match => {
      bool isWithinHorizontal =
        (offset.Left == 0 || match.X >= offset.Left) &&
        (offset.Right == 0 || match.X <= offset.Right);

      bool isWithinVertical =
        (offset.Top == 0 || match.Y >= offset.Top) &&
        (offset.Bottom == 0 || match.Y <= offset.Bottom);

      return isWithinHorizontal && isWithinVertical;
    }).ToList();
  }
}

