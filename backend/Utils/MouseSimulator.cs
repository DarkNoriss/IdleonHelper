using System.Drawing;
using System.Runtime.InteropServices;

namespace IdleonHelperBackend.Utils;

/// <summary>
/// Provides methods for simulating human-like mouse interactions.
/// </summary>
public static class MouseSimulator {
  private static readonly Random _random = new Random();
  
  // Click timing constants (25% faster than research baseline)
  public const int MOUSE_CLICK_DELAY = 188; // Average delay between clicks (25% faster)
  private const int MOUSE_CLICK_HOLD_MIN = 38; // Minimum hold time (25% faster)
  private const int MOUSE_CLICK_HOLD_MAX = 90; // Maximum hold time (25% faster)
  
  // Drag timing constants (matching clicks, but movement is MUCH faster)
  private const int MOUSE_DRAG_DELAY = 188; // Delay after drag (matches click delay - gives app time to catch up)
  private const int MOUSE_DRAG_HOLD_MIN = 60; // Initial hold before drag (25% faster - gives app time)
  private const int MOUSE_DRAG_HOLD_MAX = 135; // Maximum initial hold (25% faster)
  
  // Movement parameters (FAST dragging - gaming speed)
  private const double BASE_SPEED = 3.0; // pixels per millisecond (3000 px/s - very fast)
  private const int MIN_STEP_DELAY = 1; // Minimum delay between movement steps (very fast)
  private const int MAX_STEP_DELAY = 3; // Maximum delay between movement steps (very fast)
  private const int STEP_SIZE = 8; // Larger steps = fewer steps = faster completion

  /// <summary>
  /// Simulates a human-like mouse click at the specified coordinates.
  /// Includes slight position variation and randomized timing.
  /// </summary>
  /// <param name="point">The coordinates to click at</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="times">Number of times to click (default: 1)</param>
  /// <param name="interval">Base delay between clicks in milliseconds (default: MOUSE_CLICK_DELAY)</param>
  public static async Task Click(
    Point point,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    IntPtr hWnd = WindowCapture.GetWindowHandle();

    for (int i = 0; i < times; i++) {
      ct.ThrowIfCancellationRequested();

      // Add slight random offset (±2 pixels) for more natural clicking
      int offsetX = _random.Next(-2, 3);
      int offsetY = _random.Next(-2, 3);
      Point clickPoint = new Point(point.X + offsetX, point.Y + offsetY);
      int lParam = MakeLong(clickPoint.X, clickPoint.Y);

      // Randomized hold time
      int holdTime = _random.Next(MOUSE_CLICK_HOLD_MIN, MOUSE_CLICK_HOLD_MAX);
      
      // Randomized interval with ±20% variation
      int actualInterval = interval + _random.Next(-(interval / 5), interval / 5);

      PostMessage(hWnd, (uint)MouseMessages.WM_LBUTTONDOWN, 1, lParam);
      await Task.Delay(holdTime, ct);
      PostMessage(hWnd, (uint)MouseMessages.WM_LBUTTONUP, 0, lParam);
      await Task.Delay(actualInterval, ct);
    }
  }

  /// <summary>
  /// Simulates human-like mouse clicks at multiple coordinates.
  /// </summary>
  /// <param name="points">List of coordinates to click at</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="times">Number of times to click each coordinate (default: 1)</param>
  /// <param name="interval">Base delay between clicks in milliseconds (default: MOUSE_CLICK_DELAY)</param>
  public static async Task Click(
    List<Point> points,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    if (points == null || points.Count == 0) {
      return;
    }

    foreach (var point in points) {
      ct.ThrowIfCancellationRequested();
      await Click(point, ct, times, interval);
    }
  }

  /// <summary>
  /// Simulates a human-like mouse drag operation using bezier curves for natural movement.
  /// </summary>
  /// <param name="start">Starting coordinates</param>
  /// <param name="end">Ending coordinates</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="interval">Delay after drag in milliseconds (default: MOUSE_DRAG_DELAY)</param>
  public static async Task Drag(
    Point start,
    Point end,
    CancellationToken ct,
    int interval = MOUSE_DRAG_DELAY
  ) {
    ct.ThrowIfCancellationRequested();

    IntPtr hwnd = WindowCapture.GetWindowHandle();
    
    // Add slight random offset to start position
    int startOffsetX = _random.Next(-1, 2);
    int startOffsetY = _random.Next(-1, 2);
    Point actualStart = new Point(start.X + startOffsetX, start.Y + startOffsetY);
    
    Console.WriteLine($"[MouseSimulator] Human-like drag from {actualStart.X},{actualStart.Y} to {end.X},{end.Y}");

    // Calculate distance and duration
    double distance = Math.Sqrt(
      Math.Pow(end.X - actualStart.X, 2) + 
      Math.Pow(end.Y - actualStart.Y, 2)
    );
    
    // Fast movement - calculate based on step size, not time
    int steps = (int)Math.Ceiling(distance / STEP_SIZE);
    steps = Math.Max(5, steps); // Minimum 5 steps for smoothness
    
    // Generate control points for bezier curve
    Point control1 = GenerateControlPoint(actualStart, end, 0.33);
    Point control2 = GenerateControlPoint(actualStart, end, 0.67);
    
    // Randomized initial hold
    int initialHold = _random.Next(MOUSE_DRAG_HOLD_MIN, MOUSE_DRAG_HOLD_MAX);
    
    // Start drag
    int startLParam = MakeLong(actualStart.X, actualStart.Y);
    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONDOWN, 1, startLParam);
    await Task.Delay(initialHold, ct);
    
    // Move along bezier curve
    Point lastPoint = actualStart;
    for (int i = 1; i <= steps; i++) {
      if (ct.IsCancellationRequested) {
        PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONUP, 0, MakeLong(lastPoint.X, lastPoint.Y));
        return;
      }

      double t = (double)i / steps;
      Point currentPoint = CalculateBezierPoint(t, actualStart, control1, control2, end);
      
      // Skip if point hasn't moved (prevents unnecessary messages)
      if (currentPoint.X == lastPoint.X && currentPoint.Y == lastPoint.Y) {
        continue;
      }
      
      int currentLParam = MakeLong(currentPoint.X, currentPoint.Y);
      PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 1, currentLParam);
      
      lastPoint = currentPoint;
      
      // Variable delay between steps for more natural movement
      int stepDelay = _random.Next(MIN_STEP_DELAY, MAX_STEP_DELAY);
      await Task.Delay(stepDelay, ct);
    }
    
    // Ensure we end exactly at target
    int endLParam = MakeLong(end.X, end.Y);
    PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 1, endLParam);
    
    // Randomized final hold
    int finalHold = _random.Next(MOUSE_DRAG_HOLD_MIN, MOUSE_DRAG_HOLD_MAX);
    await Task.Delay(finalHold, ct);
    
    // Release
    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONUP, 0, endLParam);
    
    // Final delay with variation
    int actualInterval = interval + _random.Next(-(interval / 5), interval / 5);
    await Task.Delay(actualInterval, ct);
  }

  /// <summary>
  /// Generates a control point for bezier curve with random offset.
  /// </summary>
  private static Point GenerateControlPoint(Point start, Point end, double position) {
    int midX = start.X + (int)((end.X - start.X) * position);
    int midY = start.Y + (int)((end.Y - start.Y) * position);
    
    // Add perpendicular offset for more natural curve
    int dx = end.X - start.X;
    int dy = end.Y - start.Y;
    double distance = Math.Sqrt(dx * dx + dy * dy);
    
    // Offset amount based on distance (longer drags = more curve)
    int maxOffset = (int)(distance * 0.15);
    maxOffset = Math.Min(maxOffset, 50); // Cap at 50 pixels
    
    int offsetX = _random.Next(-maxOffset, maxOffset);
    int offsetY = _random.Next(-maxOffset, maxOffset);
    
    return new Point(midX + offsetX, midY + offsetY);
  }

  /// <summary>
  /// Calculates a point on a cubic bezier curve.
  /// </summary>
  private static Point CalculateBezierPoint(double t, Point p0, Point p1, Point p2, Point p3) {
    double u = 1 - t;
    double tt = t * t;
    double uu = u * u;
    double uuu = uu * u;
    double ttt = tt * t;
    
    int x = (int)(uuu * p0.X + 3 * uu * t * p1.X + 3 * u * tt * p2.X + ttt * p3.X);
    int y = (int)(uuu * p0.Y + 3 * uu * t * p1.Y + 3 * u * tt * p2.Y + ttt * p3.Y);
    
    return new Point(x, y);
  }

  /// <summary>
  /// Creates a LONG parameter from low and high words for Windows API calls.
  /// </summary>
  private static int MakeLong(int low, int high) {
    return (high << 16) | (low & 0xFFFF);
  }

  #region P/Invoke Declarations

  [DllImport("User32.dll")]
  private static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  private enum MouseMessages {
    WM_LBUTTONDOWN = 0x0201,
    WM_LBUTTONUP = 0x0202,
    WM_MOUSEMOVE = 0x0200,
    WM_MOUSEWHEEL = 0x020A,
    WM_RBUTTONDOWN = 0x0204,
    WM_RBUTTONUP = 0x0205
  }

  #endregion
}