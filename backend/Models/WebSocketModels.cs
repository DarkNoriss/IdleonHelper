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
  public List<Point> Matches { get; set; } = new();
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
}

internal class DragRepeatResponse
{
  public bool Success { get; set; }
}
