using System.Text.Json;
using Point = System.Drawing.Point;

namespace IdleonHelperBackend.Models;

internal class WebSocketMessage
{
  public string? Id { get; set; }
  public string Command { get; set; } = "";
  public JsonElement? Data { get; set; }
}

internal class FindRequest
{
  public string ImagePath { get; set; } = "";
  public int? TimeoutMs { get; set; }
  public int? IntervalMs { get; set; }
  public double? Threshold { get; set; }
  public ScreenOffsetDto? Offset { get; set; }
  public bool? Debug { get; set; }
}

internal class ScreenOffsetDto
{
  public int Left { get; set; }
  public int Right { get; set; }
  public int Top { get; set; }
  public int Bottom { get; set; }
}

internal class FindResponse
{
  public List<Point> Matches { get; set; } = new();
}

internal class MatchDto
{
  public Point Point { get; set; }
  public double Similarity { get; set; }
}

internal class FindWithDebugRequest
{
  public string ImagePath { get; set; } = "";
  public int? TimeoutMs { get; set; }
  public int? IntervalMs { get; set; }
  public double? Threshold { get; set; }
  public ScreenOffsetDto? Offset { get; set; }
}

internal class FindWithDebugResponse
{
  public List<MatchDto> Matches { get; set; } = new();
  public string? DebugImagePath { get; set; }
}

internal class ClickRequest
{
  public Point Point { get; set; }
  public int? Times { get; set; }
  public int? Interval { get; set; }
  public int? HoldTime { get; set; }
}

internal class ClickResponse
{
  public bool Success { get; set; }
}

internal class DragRequest
{
  public Point Start { get; set; }
  public Point End { get; set; }
  public int? Interval { get; set; }
  public int? StepSize { get; set; }
  public int? StepDelay { get; set; }
  public int? HoldTime { get; set; }
  public bool? Instant { get; set; }
}

internal class DragResponse
{
  public bool Success { get; set; }
}

internal class DragRepeatRequest
{
  public Point Start { get; set; }
  public Point End { get; set; }
  public int DurationSeconds { get; set; }
  public int? StepSize { get; set; }
  public int? StepDelay { get; set; }
  public int? HoldTime { get; set; }
}

internal class DragRepeatResponse
{
  public bool Success { get; set; }
}

internal class StopRequest
{
  // Empty request - no data needed
}

internal class StopResponse
{
  public bool Success { get; set; }
}

internal class KeyPressRequest
{
  public int Key { get; set; }
  public int? HoldTime { get; set; }
}

internal class KeyPressResponse
{
  public bool Success { get; set; }
}

internal class ScrollRequest
{
  public int Delta { get; set; }
  public Point Point { get; set; }
  public int? Times { get; set; }
  public int? Interval { get; set; }
}

internal class ScrollResponse
{
  public bool Success { get; set; }
}

internal class FindParallelRequest
{
  public List<string>? ImagePaths { get; set; }
  public double? Threshold { get; set; }
  public ScreenOffsetDto? Offset { get; set; }
}

internal class FindParallelResponse
{
  public Dictionary<string, List<Point>> Results { get; set; } = new();
}

internal class RectDto
{
  public int X { get; set; }
  public int Y { get; set; }
  public int Width { get; set; }
  public int Height { get; set; }
}

internal class HsvColorDto
{
  public int H { get; set; }
  public int S { get; set; }
  public int V { get; set; }
}

internal class RegionResultDto
{
  public int RegionIndex { get; set; }
  public string? Match { get; set; }
  public double Similarity { get; set; }
  public int NonZeroPixels { get; set; }
  public string? DebugImagePath { get; set; }
}

internal class ReadRegionsRequest
{
  public List<RectDto> Regions { get; set; } = new();
  public HsvColorDto? HsvLower { get; set; }
  public HsvColorDto? HsvUpper { get; set; }
  public List<string> Templates { get; set; } = new();
  public double? Threshold { get; set; }
  public bool? Debug { get; set; }
}

internal class ReadRegionsResponse
{
  public List<RegionResultDto> Results { get; set; } = new();
}
