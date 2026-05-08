using System.Diagnostics;
using System.Runtime.Versioning;
using OpenCvSharp;
using Point = System.Drawing.Point;

namespace IdleonHelperBackend.Utils;

[SupportedOSPlatform("windows10.0.19041.0")]
public static class ImageProcessing
{
  public record ScreenOffset(
    int Left = 0,
    int Right = 0,
    int Top = 0,
    int Bottom = 0
  );

  public record Match(
    Point Point,
    double Similarity
  );

  public static async Task<List<Match>> Find(
    string imagePath,
    CancellationToken ct,
    int timeoutMs,
    int intervalMs,
    double threshold,
    ScreenOffset? offset,
    bool debug
  )
  {
    ct.ThrowIfCancellationRequested();

    if (string.IsNullOrWhiteSpace(imagePath))
    {
      throw new ArgumentException("Image path cannot be null or empty", nameof(imagePath));
    }

    using var templateImage = LoadImage(imagePath);

    if (templateImage.Empty())
    {
      throw new ArgumentException("Template image cannot be null or empty", nameof(imagePath));
    }

    if (threshold is < 0.0 or > 1.0)
    {
      throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0.0 and 1.0");
    }

    offset ??= new ScreenOffset();
    List<Match> matches = [];
    var stopwatch = Stopwatch.StartNew();
    var timeoutSeconds = timeoutMs / 1000.0;

    while (stopwatch.Elapsed.TotalSeconds < timeoutSeconds)
    {
      ct.ThrowIfCancellationRequested();

      using var screenshot = WindowCapture.CaptureScreenShot(ct);
      var foundMatches = MatchTemplate(screenshot, templateImage, threshold, debug, ct);

      var filteredMatches = FilterMatchesByOffset(foundMatches, offset);
      matches.AddRange(filteredMatches);

      if (matches.Count > 0)
      {
        break;
      }

      var delayMs = timeoutMs < intervalMs ? timeoutMs : intervalMs;
      await Task.Delay(delayMs, ct);
    }

    return matches;
  }

  public static Dictionary<string, List<Match>> FindParallel(
    Mat screenshot,
    List<string> imagePaths,
    double threshold,
    ScreenOffset? offset,
    bool debug,
    CancellationToken ct
  )
  {
    ct.ThrowIfCancellationRequested();

    offset ??= new ScreenOffset();
    var results = new Dictionary<string, List<Match>>();

    foreach (var imagePath in imagePaths)
    {
      ct.ThrowIfCancellationRequested();

      using var templateImage = LoadImage(imagePath);

      if (templateImage.Empty())
      {
        results[imagePath] = [];
        continue;
      }

      var foundMatches = MatchTemplate(screenshot, templateImage, threshold, debug, ct);
      var filteredMatches = FilterMatchesByOffset(foundMatches, offset);
      results[imagePath] = filteredMatches;
    }

    return results;
  }

  public static Dictionary<string, string?> GenerateDebugImages(
    Mat screenshotGray,
    Dictionary<string, List<Match>> allMatches,
    List<string> imagePaths,
    CancellationToken ct
  )
  {
    ct.ThrowIfCancellationRequested();

    var debugPaths = new Dictionary<string, string?>();

    using var screenshotColor = new Mat();
    Cv2.CvtColor(screenshotGray, screenshotColor, ColorConversionCodes.GRAY2BGR);

    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmssfff");

    foreach (var imagePath in imagePaths)
    {
      ct.ThrowIfCancellationRequested();

      if (!allMatches.TryGetValue(imagePath, out var matches) || matches.Count == 0)
      {
        debugPaths[imagePath] = null;
        continue;
      }

      using var template = LoadImage(imagePath);
      var templateSize = template.Size();
      using var annotated = screenshotColor.Clone();

      for (var i = 0; i < matches.Count; i++)
      {
        var match = matches[i];
        var p = match.Point;
        var x = Math.Clamp(p.X - templateSize.Width / 2, 0, annotated.Width - templateSize.Width);
        var y = Math.Clamp(p.Y - templateSize.Height / 2, 0, annotated.Height - templateSize.Height);
        var rect = new Rect(x, y, templateSize.Width, templateSize.Height);

        Cv2.Rectangle(annotated, rect, new Scalar(0, 0, 255), 2);
        Cv2.PutText(annotated, i.ToString(), new OpenCvSharp.Point(x, y - 4),
          HersheyFonts.HersheySimplex, 0.5, new Scalar(0, 0, 255));

        var textY = y + templateSize.Height + 15;
        Cv2.PutText(annotated, $"({p.X}, {p.Y})", new OpenCvSharp.Point(x, textY),
          HersheyFonts.HersheySimplex, 0.5, new Scalar(0, 0, 255));
        Cv2.PutText(annotated, $"{match.Similarity:P2}", new OpenCvSharp.Point(x, textY + 15),
          HersheyFonts.HersheySimplex, 0.5, new Scalar(0, 255, 0));
      }

      var baseName = Path.GetFileNameWithoutExtension(imagePath);
      var debugFileName = $"annotated-{baseName}-{timestamp}.png";
      var debugPath = Path.Combine(AppContext.BaseDirectory, debugFileName);
      Cv2.ImWrite(debugPath, annotated);
      debugPaths[imagePath] = debugPath;
    }

    return debugPaths;
  }

  public static Mat LoadImage(string imagePath)
  {
    if (!File.Exists(imagePath))
    {
      throw new FileNotFoundException($"Image file not found: {imagePath}", imagePath);
    }

    return Cv2.ImRead(imagePath, ImreadModes.Grayscale);
  }


  private static List<Match> MatchTemplate(
    Mat screenshot,
    Mat templateImage,
    double threshold,
    bool debug = false,
    CancellationToken ct = default
  )
  {
    ct.ThrowIfCancellationRequested();

    if (screenshot.Width < templateImage.Width || screenshot.Height < templateImage.Height)
    {
      return [];
    }

    using var result = new Mat();
    Cv2.MatchTemplate(screenshot, templateImage, result, TemplateMatchModes.CCoeffNormed);

    if (debug)
    {
      Cv2.MinMaxLoc(result, out _, out var maxVal, out _, out _);
      Console.WriteLine($"MatchTemplate debug: max correlation={maxVal:P2}, threshold={threshold:P2}");
    }

    using var binaryResult = new Mat();
    Cv2.Threshold(result, binaryResult, threshold, 1.0, ThresholdTypes.Binary);

    using var nonZeroCoordinates = new Mat();
    Cv2.FindNonZero(binaryResult, nonZeroCoordinates);

    var templateSize = templateImage.Size();
    var halfWidth = templateSize.Width / 2;
    var halfHeight = templateSize.Height / 2;

    List<Match> matches = [];

    for (var i = 0; i < nonZeroCoordinates.Rows; i++)
    {
      ct.ThrowIfCancellationRequested();

      var cvPoint = nonZeroCoordinates.At<Point>(i);
      var matchPoint = new Point(cvPoint.X + halfWidth, cvPoint.Y + halfHeight);

      var similarity = result.At<float>(cvPoint.Y, cvPoint.X);
      
      matches.Add(new Match(matchPoint, similarity));
    }

    return matches;
  }

  private static List<Match> FilterMatchesByOffset(List<Match> matches,
    ScreenOffset offset)
  {
    return matches.Where(match =>
    {
      var isWithinHorizontal =
        (offset.Left == 0 || match.Point.X >= offset.Left) &&
        (offset.Right == 0 || match.Point.X <= offset.Right);

      var isWithinVertical =
        (offset.Top == 0 || match.Point.Y >= offset.Top) &&
        (offset.Bottom == 0 || match.Point.Y <= offset.Bottom);

      return isWithinHorizontal && isWithinVertical;
    }).ToList();
  }

  public static async Task<(List<Match> matches, string? debugImagePath)> FindWithDebug(
    string templateImagePath,
    CancellationToken ct,
    int timeoutMs,
    int intervalMs,
    double threshold,
    ScreenOffset? offset
  )
  {
    ct.ThrowIfCancellationRequested();

    var matches = await Find(templateImagePath, ct, timeoutMs, intervalMs, threshold, offset, false);

    using var template = LoadImage(templateImagePath);

    string? debugPath = null;

    if (matches.Count <= 0) return (matches, debugPath);

    using var screenshotGray = WindowCapture.CaptureScreenShot(ct);
    using var screenshotColor = new Mat();
    Cv2.CvtColor(screenshotGray, screenshotColor, ColorConversionCodes.GRAY2BGR);

    var templateSize = template.Size();
    for (var i = 0; i < matches.Count; i++)
    {
      var match = matches[i];
      var p = match.Point;
      var x = Math.Clamp(p.X - templateSize.Width / 2, 0, screenshotColor.Width - templateSize.Width);
      var y = Math.Clamp(p.Y - templateSize.Height / 2, 0, screenshotColor.Height - templateSize.Height);
      var rect = new Rect(x, y, templateSize.Width, templateSize.Height);

      Console.WriteLine($"Debug: index={i}, point={p}, similarity={match.Similarity:P2}");

      Cv2.Rectangle(screenshotColor, rect, new Scalar(0, 0, 255), 2);

      Cv2.PutText(
        screenshotColor,
        i.ToString(),
        new OpenCvSharp.Point(x, y - 4),
        HersheyFonts.HersheySimplex,
        0.5,
        new Scalar(0, 0, 255)
      );

      var coordText = $"({p.X}, {p.Y})";
      var similarityText = $"{match.Similarity:P2}";
      var textY = y + templateSize.Height + 15;
      Cv2.PutText(
        screenshotColor,
        coordText,
        new OpenCvSharp.Point(x, textY),
        HersheyFonts.HersheySimplex,
        0.5,
        new Scalar(0, 0, 255)
      );
      Cv2.PutText(
        screenshotColor,
        similarityText,
        new OpenCvSharp.Point(x, textY + 15),
        HersheyFonts.HersheySimplex,
        0.5,
        new Scalar(0, 255, 0)
      );
    }

    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmssfff");
    var baseName = Path.GetFileNameWithoutExtension(templateImagePath);
    var debugFileName = $"annotated-{baseName}-{timestamp}.png";
    debugPath = Path.Combine(AppContext.BaseDirectory, debugFileName);
    Cv2.ImWrite(debugPath, screenshotColor);

    return (matches, debugPath);
  }

  public record RegionRect(
    int X,
    int Y,
    int Width,
    int Height
  );

  public record HsvColor(
    int H,
    int S,
    int V
  );

  public record RegionResult(
    int RegionIndex,
    string? MatchedTemplate,
    double Similarity,
    int NonZeroPixels,
    string? DebugImagePath
  );

  public static List<RegionResult> ReadRegions(
    Mat colorScreenshot,
    List<RegionRect> regions,
    HsvColor hsvLower,
    HsvColor hsvUpper,
    List<string> templatePaths,
    double threshold,
    bool debug,
    CancellationToken ct
  )
  {
    ct.ThrowIfCancellationRequested();

    var results = new List<RegionResult>();

    var templates = new List<(string name, Mat mat)>();
    foreach (var path in templatePaths)
    {
      if (!File.Exists(path)) continue;
      var template = LoadImage(path);
      var name = Path.GetFileNameWithoutExtension(path);
      templates.Add((name, template));
    }

    var debugDir = debug ? Path.Combine(AppContext.BaseDirectory, "debug-regions") : null;
    if (debug && debugDir != null)
    {
      Directory.CreateDirectory(debugDir);
    }

    try
    {
      using var hsvImage = new Mat();
      Cv2.CvtColor(colorScreenshot, hsvImage, ColorConversionCodes.BGR2HSV);

      var lowerScalar = new Scalar(hsvLower.H, hsvLower.S, hsvLower.V);
      var upperScalar = new Scalar(hsvUpper.H, hsvUpper.S, hsvUpper.V);
      for (var i = 0; i < regions.Count; i++)
      {
        ct.ThrowIfCancellationRequested();

        var region = regions[i];

        var roiX = Math.Clamp(region.X, 0, colorScreenshot.Width - 1);
        var roiY = Math.Clamp(region.Y, 0, colorScreenshot.Height - 1);
        var roiW = Math.Min(region.Width, colorScreenshot.Width - roiX);
        var roiH = Math.Min(region.Height, colorScreenshot.Height - roiY);

        if (roiW <= 0 || roiH <= 0)
        {
          results.Add(new RegionResult(i, null, 0, 0, null));
          continue;
        }

        var roiRect = new Rect(roiX, roiY, roiW, roiH);

        using var hsvRoi = new Mat(hsvImage, roiRect);
        using var mask = new Mat();
        Cv2.InRange(hsvRoi, lowerScalar, upperScalar, mask);

        var nonZeroCount = Cv2.CountNonZero(mask);
        if (nonZeroCount < 10)
        {
          results.Add(new RegionResult(i, null, 0, nonZeroCount, null));
          continue;
        }

        using var colorRoi = new Mat(colorScreenshot, roiRect);
        using var masked = new Mat();
        colorRoi.CopyTo(masked, mask);

        using var grayRoi = new Mat();
        Cv2.CvtColor(masked, grayRoi, ColorConversionCodes.BGR2GRAY);

        using var binaryRoi = new Mat();
        Cv2.Threshold(grayRoi, binaryRoi, 1, 255, ThresholdTypes.Binary);

        string? debugImagePath = null;
        if (debug && debugDir != null)
        {
          var rawRoiPath = Path.Combine(debugDir, $"roi-{i}-raw.png");
          var filteredPath = Path.Combine(debugDir, $"roi-{i}-filtered.png");
          using var rawColorRoi = new Mat(colorScreenshot, roiRect);
          Cv2.ImWrite(rawRoiPath, rawColorRoi);
          Cv2.ImWrite(filteredPath, binaryRoi);
          debugImagePath = filteredPath;
        }

        string? bestMatch = null;
        var bestSimilarity = 0.0;

        foreach (var (name, template) in templates)
        {
          if (binaryRoi.Width < template.Width || binaryRoi.Height < template.Height)
            continue;

          using var result = new Mat();
          Cv2.MatchTemplate(binaryRoi, template, result, TemplateMatchModes.CCoeffNormed);
          Cv2.MinMaxLoc(result, out _, out var maxVal, out _, out _);

          if (maxVal > bestSimilarity)
          {
            bestSimilarity = maxVal;
            bestMatch = name;
          }
        }

        results.Add(new RegionResult(
          i,
          bestSimilarity >= threshold ? bestMatch : null,
          bestSimilarity,
          nonZeroCount,
          debugImagePath
        ));
      }
    }
    finally
    {
      foreach (var (_, mat) in templates)
      {
        mat.Dispose();
      }
    }

    return results;
  }

  public static string CaptureHsvScreen(
    HsvColor hsvLower,
    HsvColor hsvUpper,
    CancellationToken ct
  )
  {
    ct.ThrowIfCancellationRequested();

    using var colorScreenshot = WindowCapture.CaptureScreenShotColor(ct);
    using var hsvImage = new Mat();
    Cv2.CvtColor(colorScreenshot, hsvImage, ColorConversionCodes.BGR2HSV);

    var lowerScalar = new Scalar(hsvLower.H, hsvLower.S, hsvLower.V);
    var upperScalar = new Scalar(hsvUpper.H, hsvUpper.S, hsvUpper.V);

    using var mask = new Mat();
    Cv2.InRange(hsvImage, lowerScalar, upperScalar, mask);

    var outputDir = Path.Combine(AppContext.BaseDirectory, "screenshots");
    Directory.CreateDirectory(outputDir);

    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmssfff");
    var fileName = $"hsv-{timestamp}.png";
    var outputPath = Path.Combine(outputDir, fileName);

    Cv2.ImWrite(outputPath, mask);

    return outputPath;
  }

  public static async Task<List<Match>> FindHSV(
    string imagePath,
    HsvColor hsvLower,
    HsvColor hsvUpper,
    CancellationToken ct,
    int timeoutMs,
    int intervalMs,
    double threshold,
    ScreenOffset? offset
  )
  {
    ct.ThrowIfCancellationRequested();

    if (string.IsNullOrWhiteSpace(imagePath))
    {
      throw new ArgumentException("Image path cannot be null or empty", nameof(imagePath));
    }

    using var templateImage = LoadImage(imagePath);
    if (templateImage.Empty())
    {
      throw new ArgumentException("Template image cannot be null or empty", nameof(imagePath));
    }

    // Binarize template to match the strict 0/255 mask produced by Cv2.InRange at runtime.
    // PNG crops/exports often introduce anti-aliased edges that tank CCoeffNormed correlation.
    Cv2.Threshold(templateImage, templateImage, 127, 255, ThresholdTypes.Binary);

    if (threshold is < 0.0 or > 1.0)
    {
      throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0.0 and 1.0");
    }

    offset ??= new ScreenOffset();
    List<Match> matches = [];
    var stopwatch = Stopwatch.StartNew();
    var timeoutSeconds = timeoutMs / 1000.0;

    while (stopwatch.Elapsed.TotalSeconds < timeoutSeconds)
    {
      ct.ThrowIfCancellationRequested();

      using var colorScreenshot = WindowCapture.CaptureScreenShotColor(ct);
      using var mask = BuildHsvMask(colorScreenshot, hsvLower, hsvUpper);

      var foundMatches = MatchTemplate(mask, templateImage, threshold, false, ct);
      var filteredMatches = FilterMatchesByOffset(foundMatches, offset);
      matches.AddRange(filteredMatches);

      if (matches.Count > 0)
      {
        break;
      }

      var delayMs = timeoutMs < intervalMs ? timeoutMs : intervalMs;
      await Task.Delay(delayMs, ct);
    }

    return matches;
  }

  public static Dictionary<string, List<Match>> FindHSVParallel(
    Mat binaryMask,
    List<string> imagePaths,
    double threshold,
    ScreenOffset? offset,
    bool debug,
    CancellationToken ct
  )
  {
    ct.ThrowIfCancellationRequested();

    offset ??= new ScreenOffset();
    var results = new Dictionary<string, List<Match>>();

    foreach (var imagePath in imagePaths)
    {
      ct.ThrowIfCancellationRequested();

      using var templateImage = LoadImage(imagePath);
      if (templateImage.Empty())
      {
        results[imagePath] = [];
        continue;
      }

      // Binarize template to match the strict 0/255 mask. See FindHSV for rationale.
      Cv2.Threshold(templateImage, templateImage, 127, 255, ThresholdTypes.Binary);

      var foundMatches = MatchTemplate(binaryMask, templateImage, threshold, debug, ct);
      results[imagePath] = FilterMatchesByOffset(foundMatches, offset);
    }

    return results;
  }

  internal static Mat BuildHsvMask(Mat colorScreenshot, HsvColor hsvLower, HsvColor hsvUpper)
  {
    var hsvImage = new Mat();
    try
    {
      Cv2.CvtColor(colorScreenshot, hsvImage, ColorConversionCodes.BGR2HSV);
      var lowerScalar = new Scalar(hsvLower.H, hsvLower.S, hsvLower.V);
      var upperScalar = new Scalar(hsvUpper.H, hsvUpper.S, hsvUpper.V);
      var mask = new Mat();
      Cv2.InRange(hsvImage, lowerScalar, upperScalar, mask);
      return mask;
    }
    finally
    {
      hsvImage.Dispose();
    }
  }
}

