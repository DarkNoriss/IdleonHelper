using System.Drawing;
using System.Runtime.InteropServices;

namespace IdleonBotBackend.Utils;

/// <summary>
/// Provides methods for simulating mouse interactions (clicks and drags) on a target window.
/// </summary>
public static class MouseSimulator {
  // Timing constants - DO NOT LOWER THESE VALUES
  public const int MOUSE_CLICK_DELAY = 125; // Minimum delay between clicks
  private const int MOUSE_CLICK_DELAY_HOLD = 25; // Minimum hold time for click
  private const int MOUSE_DRAG_DELAY = 125; // Minimum delay after drag
  private const int MOUSE_DRAG_DELAY_HOLD = 25; // Minimum hold time during drag

  /// <summary>
  /// Simulates a mouse click at the specified coordinates.
  /// </summary>
  /// <param name="point">The coordinates to click at</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="times">Number of times to click (default: 1)</param>
  /// <param name="interval">Delay between clicks in milliseconds (default: MOUSE_CLICK_DELAY)</param>
  /// <param name="intervalHold">Hold time for each click in milliseconds (default: MOUSE_CLICK_DELAY_HOLD)</param>
  public static async Task Click(
    Point point,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY,
    int intervalHold = MOUSE_CLICK_DELAY_HOLD
  ) {
    ct.ThrowIfCancellationRequested();

    IntPtr hWnd = WindowCapture.GetWindowHandle();
    int lParam = MakeLong(point.X, point.Y);

    for (int i = 0; i < times; i++) {
      ct.ThrowIfCancellationRequested();

      PostMessage(hWnd, (uint)MouseMessages.WM_LBUTTONDOWN, 1, lParam);
      await Task.Delay(intervalHold, ct);
      PostMessage(hWnd, (uint)MouseMessages.WM_LBUTTONUP, 0, lParam);
      await Task.Delay(interval, ct);
    }
  }

  /// <summary>
  /// Simulates mouse clicks at multiple coordinates.
  /// </summary>
  /// <param name="points">List of coordinates to click at</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="times">Number of times to click each coordinate (default: 1)</param>
  /// <param name="interval">Delay between clicks in milliseconds (default: MOUSE_CLICK_DELAY)</param>
  /// <param name="intervalHold">Hold time for each click in milliseconds (default: MOUSE_CLICK_DELAY_HOLD)</param>
  public static async Task Click(
    List<Point> points,
    CancellationToken ct,
    int times = 1,
    int interval = MOUSE_CLICK_DELAY,
    int intervalHold = MOUSE_CLICK_DELAY_HOLD
  ) {
    ct.ThrowIfCancellationRequested();

    if (points == null || points.Count == 0) {
      Console.WriteLine("No coordinates to click");
      return;
    }

    foreach (var point in points) {
      ct.ThrowIfCancellationRequested();
      await Click(point, ct, times, interval, intervalHold);
    }
  }

  /// <summary>
  /// Simulates a mouse drag operation from start to end coordinates.
  /// </summary>
  /// <param name="start">Starting coordinates</param>
  /// <param name="end">Ending coordinates</param>
  /// <param name="ct">Cancellation token</param>
  /// <param name="interval">Delay after drag in milliseconds (default: MOUSE_DRAG_DELAY)</param>
  /// <param name="hold">Hold time during drag in milliseconds (default: MOUSE_DRAG_DELAY_HOLD)</param>
  /// <param name="instant">If true, performs instant drag; otherwise performs smooth drag (default: false)</param>
  /// <param name="stepSize">Step size for smooth drag in pixels (default: 1)</param>
  public static async Task Drag(
    Point start,
    Point end,
    CancellationToken ct,
    int interval = MOUSE_DRAG_DELAY,
    int hold = MOUSE_DRAG_DELAY_HOLD,
    bool instant = false,
    int stepSize = 1
  ) {
    ct.ThrowIfCancellationRequested();

    IntPtr hwnd = WindowCapture.GetWindowHandle();
    int startLParam = MakeLong(start.X, start.Y);
    int endLParam = MakeLong(end.X, end.Y);

    if (instant) {
      await DragInstant(startLParam, endLParam, hwnd, hold, ct);
    } else {
      await DragSmooth(startLParam, endLParam, hwnd, hold, stepSize, ct);
    }

    await Task.Delay(interval, ct);
  }

  /// <summary>
  /// Performs an instant drag operation (no intermediate steps).
  /// </summary>
  private static async Task DragInstant(int start, int end, IntPtr hwnd, int hold, CancellationToken ct) {
    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONDOWN, 1, start);
    PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 0, start);
    await Task.Delay(hold, ct);
    PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 0, end);
    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONUP, 0, end);
  }

  /// <summary>
  /// Performs a smooth drag operation with intermediate steps.
  /// </summary>
  private static async Task DragSmooth(int start, int end, IntPtr hwnd, int hold, int stepSize, CancellationToken ct) {
    int startX = (short)(start & 0xFFFF);
    int startY = (short)((start >> 16) & 0xFFFF);
    int endX = (short)(end & 0xFFFF);
    int endY = (short)((end >> 16) & 0xFFFF);

    int distanceX = Math.Abs(endX - startX);
    int distanceY = Math.Abs(endY - startY);
    double distance = Math.Sqrt(distanceX * distanceX + distanceY * distanceY);
    int steps = (int)Math.Ceiling(distance / stepSize);

    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONDOWN, 1, start);
    await Task.Delay(hold, ct);
    PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 0, start);

    for (int i = 1; i <= steps; i++) {
      if (ct.IsCancellationRequested) return;

      int currentX = startX + (endX - startX) * i / steps;
      int currentY = startY + (endY - startY) * i / steps;
      int currentLParam = MakeLong(currentX, currentY);

      PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 0, currentLParam);
      await Task.Delay(1, ct);
    }

    PostMessage(hwnd, (uint)MouseMessages.WM_MOUSEMOVE, 0, end);
    await Task.Delay(hold, ct);
    PostMessage(hwnd, (uint)MouseMessages.WM_LBUTTONUP, 0, end);
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
