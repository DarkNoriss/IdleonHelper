using System.Drawing;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace IdleonHelperBackend.Utils;

[SupportedOSPlatform("windows10.0.19041.0")]
public static class MouseSimulator
{
  public static async Task Click(
    Point point,
    CancellationToken ct,
    int times,
    int interval,
    int holdTime
  )
  {
    ct.ThrowIfCancellationRequested();

    var hWnd = WindowCapture.GetWindowHandle();

    for (var i = 0; i < times; i++)
    {
      ct.ThrowIfCancellationRequested();

      var lParam = MakeLong(point.X, point.Y);

      PostMessage(hWnd, (uint)MouseMessages.WmLbuttondown, 1, lParam);
      await Task.Delay(holdTime, ct);
      PostMessage(hWnd, (uint)MouseMessages.WmLbuttonup, 0, lParam);
      await Task.Delay(interval, ct);
    }
  }

  public static async Task Drag(
    Point start,
    Point end,
    CancellationToken ct,
    int interval,
    int stepSize,
    int stepDelay,
    int holdTime,
    bool instant = false
  )
  {
    ct.ThrowIfCancellationRequested();

    var hwnd = WindowCapture.GetWindowHandle();

    var startLParam = MakeLong(start.X, start.Y);
    var endLParam = MakeLong(end.X, end.Y);
    
    PostMessage(hwnd, (uint)MouseMessages.WmLbuttondown, 1, startLParam);
    await Task.Delay(holdTime, ct);

    if (instant)
    {
      if (ct.IsCancellationRequested)
      {
        PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, startLParam);
        return;
      }

      PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, endLParam);

      await Task.Delay(holdTime, ct);

      PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, endLParam);

      await Task.Delay(interval, ct);
      return;
    }

    var distance = Math.Sqrt(
      Math.Pow(end.X - start.X, 2) +
      Math.Pow(end.Y - start.Y, 2)
    );

    var steps = (int)Math.Ceiling(distance / stepSize);
    steps = Math.Max(5, steps);

    var control1 = GenerateControlPoint(start, end, 0.33);
    var control2 = GenerateControlPoint(start, end, 0.67);

    var lastPoint = start;
    for (var i = 1; i <= steps; i++)
    {
      if (ct.IsCancellationRequested)
      {
        PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, MakeLong(lastPoint.X, lastPoint.Y));
        return;
      }

      var t = (double)i / steps;
      var currentPoint = CalculateBezierPoint(t, start, control1, control2, end);

      if (currentPoint.X == lastPoint.X && currentPoint.Y == lastPoint.Y)
      {
        continue;
      }

      var currentLParam = MakeLong(currentPoint.X, currentPoint.Y);
      PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, currentLParam);

      lastPoint = currentPoint;

      await Task.Delay(stepDelay, ct);
    }

    PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, endLParam);

    await Task.Delay(holdTime, ct);

    PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, endLParam);

    await Task.Delay(interval, ct);
  }

  public static async Task DragRepeat(
    Point start,
    Point end,
    int durationSeconds,
    CancellationToken ct,
    int stepSize,
    int stepDelay,
    int holdTime
  )
  {
    ct.ThrowIfCancellationRequested();

    var hwnd = WindowCapture.GetWindowHandle();

    var startLParam = MakeLong(start.X, start.Y);
    PostMessage(hwnd, (uint)MouseMessages.WmLbuttondown, 1, startLParam);
    await Task.Delay(holdTime, ct);

    var stopwatch = System.Diagnostics.Stopwatch.StartNew();
    var durationMs = durationSeconds * 1000;

    var goingToEnd = true;

    while (stopwatch.ElapsedMilliseconds < durationMs)
    {
      if (ct.IsCancellationRequested)
      {
        PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, MakeLong(start.X, start.Y));
        return;
      }

      var from = goingToEnd ? start : end;
      var to = goingToEnd ? end : start;

      var distance = Math.Sqrt(
        Math.Pow(to.X - from.X, 2) +
        Math.Pow(to.Y - from.Y, 2)
      );

      var steps = (int)Math.Ceiling(distance / stepSize);
      steps = Math.Max(5, steps);

      var control1 = GenerateControlPoint(from, to, 0.33);
      var control2 = GenerateControlPoint(from, to, 0.67);

      for (var i = 1; i <= steps; i++)
      {
        if (stopwatch.ElapsedMilliseconds >= durationMs)
        {
          break;
        }

        if (ct.IsCancellationRequested)
        {
          PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, MakeLong(from.X, from.Y));
          return;
        }

        var t = (double)i / steps;
        var currentPoint = CalculateBezierPoint(t, from, control1, control2, to);

        var currentLParam = MakeLong(currentPoint.X, currentPoint.Y);
        PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, currentLParam);

        await Task.Delay(stepDelay, ct);
      }

      if (stopwatch.ElapsedMilliseconds >= durationMs)
      {
        break;
      }

      goingToEnd = !goingToEnd;
    }

    var currentPos = goingToEnd ? start : end;
    var endLParam = MakeLong(currentPos.X, currentPos.Y);
    PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, endLParam);

    stopwatch.Stop();
  }

  public static async Task DragPath(
    List<Point> points,
    CancellationToken ct,
    int stepSize,
    int stepDelay,
    int holdTime
  )
  {
    ct.ThrowIfCancellationRequested();

    if (points == null || points.Count < 2)
    {
      throw new ArgumentException("DragPath requires at least 2 points");
    }

    var hwnd = WindowCapture.GetWindowHandle();

    var first = points[0];
    var startLParam = MakeLong(first.X, first.Y);

    PostMessage(hwnd, (uint)MouseMessages.WmLbuttondown, 1, startLParam);
    await Task.Delay(holdTime, ct);

    var lastPoint = first;

    for (var segmentIndex = 0; segmentIndex < points.Count - 1; segmentIndex++)
    {
      var from = points[segmentIndex];
      var to = points[segmentIndex + 1];

      var dx = to.X - from.X;
      var dy = to.Y - from.Y;
      var distance = Math.Sqrt(dx * dx + dy * dy);

      if (distance < 1.0)
      {
        continue;
      }

      var steps = (int)Math.Ceiling(distance / stepSize);
      steps = Math.Max(1, steps);

      for (var i = 1; i <= steps; i++)
      {
        if (ct.IsCancellationRequested)
        {
          PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, MakeLong(lastPoint.X, lastPoint.Y));
          ct.ThrowIfCancellationRequested();
        }

        var t = (double)i / steps;
        var cx = (int)Math.Round(from.X + dx * t);
        var cy = (int)Math.Round(from.Y + dy * t);

        if (cx == lastPoint.X && cy == lastPoint.Y)
        {
          continue;
        }

        var currentLParam = MakeLong(cx, cy);
        PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, currentLParam);

        lastPoint = new Point(cx, cy);

        await Task.Delay(stepDelay, ct);
      }
    }

    var endPoint = points[points.Count - 1];
    var endLParam = MakeLong(endPoint.X, endPoint.Y);

    PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, endLParam);
    await Task.Delay(holdTime, ct);
    PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, endLParam);
  }

  private static Point GenerateControlPoint(Point start, Point end, double position)
  {
    var midX = start.X + (int)((end.X - start.X) * position);
    var midY = start.Y + (int)((end.Y - start.Y) * position);

    var dx = end.X - start.X;
    var dy = end.Y - start.Y;
    var distance = Math.Sqrt(dx * dx + dy * dy);

    var offset = (int)(distance * 0.1);
    offset = Math.Min(offset, 30);

    return new Point(midX + offset, midY - offset);
  }

  private static Point CalculateBezierPoint(double t, Point p0, Point p1, Point p2, Point p3)
  {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;

    var x = (int)(uuu * p0.X + 3 * uu * t * p1.X + 3 * u * tt * p2.X + ttt * p3.X);
    var y = (int)(uuu * p0.Y + 3 * uu * t * p1.Y + 3 * u * tt * p2.Y + ttt * p3.Y);

    return new Point(x, y);
  }

  public static async Task Scroll(Point point, int delta, int times, CancellationToken ct, int interval = 100)
  {
    var hWnd = WindowCapture.GetWindowHandle();

    var clientLParam = (IntPtr)MakeLong(point.X, point.Y);

    // Convert to screen coordinates for WM_MOUSEWHEEL (requires screen coords in lParam)
    var pt = new PointStruct { X = point.X, Y = point.Y };
    ClientToScreen(hWnd, ref pt);
    var screenLParam = (IntPtr)MakeLong(pt.X, pt.Y);

    // Move mouse so game detects cursor position (client coords)
    PostMessage(hWnd, (uint)MouseMessages.WmMousemove, IntPtr.Zero, clientLParam);

    // Scroll (screen coords in lParam)
    for (var i = 0; i < times; i++)
    {
      ct.ThrowIfCancellationRequested();

      var wParam = (IntPtr)(delta << 16);
      PostMessage(hWnd, WmMousewheel, wParam, screenLParam);

      if (i < times - 1)
        await Task.Delay(interval, ct);
    }
  }

  private static int MakeLong(int low, int high)
  {
    return (high << 16) | (low & 0xFFFF);
  }

  private const uint WmMousewheel = 0x020A;

  [StructLayout(LayoutKind.Sequential)]
  private struct PointStruct { public int X; public int Y; }

  [DllImport("User32.dll")]
  private static extern bool ClientToScreen(IntPtr hWnd, ref PointStruct lpPoint);

  [DllImport("User32.dll")]
  private static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

  private enum MouseMessages
  {
    WmLbuttondown = 0x0201,
    WmLbuttonup = 0x0202,
    WmMousemove = 0x0200,
  }
}