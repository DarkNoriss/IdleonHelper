using System.Drawing;
using System.Runtime.InteropServices;

namespace IdleonHelperBackend.Utils;

public static class MouseSimulator {
  private static readonly Random Rand = new Random();

  public const int MOUSE_CLICK_DELAY = 200;
  private const int MOUSE_CLICK_HOLD_MIN = 50;
  private const int MOUSE_CLICK_HOLD_MAX = 50;

  private const int MOUSE_DRAG_DELAY = 300;
  private const int MOUSE_DRAG_HOLD_MIN = 150;
  private const int MOUSE_DRAG_HOLD_MAX = 150;

  private const int MIN_STEP_DELAY = 1;
  private const int MAX_STEP_DELAY = 3;
  private const int STEP_SIZE = 3;

  public static async Task Click(
    Point point,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    var hWnd = WindowCapture.GetWindowHandle();

    for (var i = 0; i < times; i++) {
      ct.ThrowIfCancellationRequested();

      var offsetX = Rand.Next(-2, 3);
      var offsetY = Rand.Next(-2, 3);
      var clickPoint = new Point(point.X + offsetX, point.Y + offsetY);
      var lParam = MakeLong(clickPoint.X, clickPoint.Y);

      var holdTime = Rand.Next(MOUSE_CLICK_HOLD_MIN, MOUSE_CLICK_HOLD_MAX);

      var actualInterval = interval + Rand.Next(-(interval / 5), interval / 5);

      PostMessage(hWnd, (uint)MouseMessages.WmLbuttondown, 1, lParam);
      await Task.Delay(holdTime, ct);
      PostMessage(hWnd, (uint)MouseMessages.WmLbuttonup, 0, lParam);
      await Task.Delay(actualInterval, ct);
    }
  }

  public static async Task Click(
    List<Point> points,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    if (points.Count == 0) {
      return;
    }

    foreach (var point in points) {
      ct.ThrowIfCancellationRequested();
      await Click(point, ct, times, interval);
    }
  }

  public static async Task Drag(
    Point start,
    Point end,
    CancellationToken ct,
    int interval = MOUSE_DRAG_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    var hwnd = WindowCapture.GetWindowHandle();

    var startOffsetX = Rand.Next(-1, 2);
    var startOffsetY = Rand.Next(-1, 2);
    var actualStart = new Point(start.X + startOffsetX, start.Y + startOffsetY);

    Console.WriteLine($"[MouseSimulator] Human-like drag from {actualStart.X},{actualStart.Y} to {end.X},{end.Y}");

    var distance = Math.Sqrt(
      Math.Pow(end.X - actualStart.X, 2) +
      Math.Pow(end.Y - actualStart.Y, 2)
    );

    var steps = (int)Math.Ceiling(distance / STEP_SIZE);
    steps = Math.Max(5, steps);

    var control1 = GenerateControlPoint(actualStart, end, 0.33);
    var control2 = GenerateControlPoint(actualStart, end, 0.67);

    var initialHold = Rand.Next(MOUSE_DRAG_HOLD_MIN, MOUSE_DRAG_HOLD_MAX);

    var startLParam = MakeLong(actualStart.X, actualStart.Y);
    PostMessage(hwnd, (uint)MouseMessages.WmLbuttondown, 1, startLParam);
    await Task.Delay(initialHold, ct);

    var lastPoint = actualStart;
    for (var i = 1; i <= steps; i++) {
      if (ct.IsCancellationRequested) {
        PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, MakeLong(lastPoint.X, lastPoint.Y));
        return;
      }

      var t = (double)i / steps;
      var currentPoint = CalculateBezierPoint(t, actualStart, control1, control2, end);

      if (currentPoint.X == lastPoint.X && currentPoint.Y == lastPoint.Y) {
        continue;
      }

      var currentLParam = MakeLong(currentPoint.X, currentPoint.Y);
      PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, currentLParam);

      lastPoint = currentPoint;

      var stepDelay = Rand.Next(MIN_STEP_DELAY, MAX_STEP_DELAY);
      await Task.Delay(stepDelay, ct);
    }

    var endLParam = MakeLong(end.X, end.Y);
    PostMessage(hwnd, (uint)MouseMessages.WmMousemove, 1, endLParam);

    var finalHold = Rand.Next(MOUSE_DRAG_HOLD_MIN, MOUSE_DRAG_HOLD_MAX);
    await Task.Delay(finalHold, ct);

    PostMessage(hwnd, (uint)MouseMessages.WmLbuttonup, 0, endLParam);

    var actualInterval = interval + Rand.Next(-(interval / 5), interval / 5);
    await Task.Delay(actualInterval, ct);
  }

  private static Point GenerateControlPoint(Point start, Point end, double position) {
    var midX = start.X + (int)((end.X - start.X) * position);
    var midY = start.Y + (int)((end.Y - start.Y) * position);

    var dx = end.X - start.X;
    var dy = end.Y - start.Y;
    var distance = Math.Sqrt(dx * dx + dy * dy);

    var maxOffset = (int)(distance * 0.15);
    maxOffset = Math.Min(maxOffset, 50);

    var offsetX = Rand.Next(-maxOffset, maxOffset);
    var offsetY = Rand.Next(-maxOffset, maxOffset);

    return new Point(midX + offsetX, midY + offsetY);
  }

  private static Point CalculateBezierPoint(double t, Point p0, Point p1, Point p2, Point p3) {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;

    var x = (int)(uuu * p0.X + 3 * uu * t * p1.X + 3 * u * tt * p2.X + ttt * p3.X);
    var y = (int)(uuu * p0.Y + 3 * uu * t * p1.Y + 3 * u * tt * p2.Y + ttt * p3.Y);

    return new Point(x, y);
  }

  private static int MakeLong(int low, int high) {
    return (high << 16) | (low & 0xFFFF);
  }

  [DllImport("User32.dll")]
  private static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

  private enum MouseMessages {
    WmLbuttondown = 0x0201,
    WmLbuttonup = 0x0202,
    WmMousemove = 0x0200,
  }
}