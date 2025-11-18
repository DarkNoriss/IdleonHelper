using System.Drawing;
using System.Runtime.InteropServices;
using OpenCvSharp;
using OpenCvSharp.Extensions;


namespace IdleonBotBackend.Utils {
  public class WindowCapture {
    private const string WINDOW_NAME = "Legends Of Idleon";
    private const int WINDOW_HEIGHT = 572;
    private const int WINDOW_WIDTH = 960;
    private static IntPtr WINDOW_ID = IntPtr.Zero;

    public static Mat CaptureScreenShot(CancellationToken ct) {
      IntPtr hwnd = GetHwnd();

      if (!TryGetWindowSize(hwnd, out int width, out int height)) throw new Exception("Failed to get window size");

      if (width != WINDOW_WIDTH || height != WINDOW_HEIGHT) {
        ResizeWindow(hwnd, ct);
        if (!TryGetWindowSize(hwnd, out width, out height)) throw new Exception("Failed to get window size");
      }

      using Bitmap bmp = CaptureWindowBitmap(hwnd, width, height) ?? throw new Exception("Failed to capture window bitmap");
      Mat grayMat = bmp.ToMat().CvtColor(ColorConversionCodes.BGR2GRAY);

      return grayMat;
    }

    public static void CaptureAndDisplay(CancellationToken ct) {
      Mat grayMat = CaptureScreenShot(ct);
      Cv2.ImShow("Window Capture", grayMat);
      Cv2.WaitKey(1);
      grayMat.Dispose();
    }

    private static bool TryGetWindowSize(IntPtr hwnd, out int width, out int height) {
      if (!GetWindowRect(hwnd, out RECT rect)) {
        width = 0;
        height = 0;
        return false;
      }

      width = rect.Right - rect.Left;
      height = rect.Bottom - rect.Top;
      return true;
    }

    private static void ResizeWindow(IntPtr hwnd, CancellationToken ct) {
      GetWindowRect(hwnd, out RECT rect);
      MoveWindow(hwnd, rect.Left, rect.Top, WINDOW_WIDTH, WINDOW_HEIGHT, true);
      Task.Delay(50, ct).Wait(ct);
    }

    private static Bitmap CaptureWindowBitmap(IntPtr hwnd, int width, int height) {
      IntPtr hdcSrc = GetDC(hwnd);
      IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
      IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, width, height);
      IntPtr hOld = SelectObject(hdcDest, hBitmap);

      if (!BitBlt(hdcDest, 0, 0, width, height, hdcSrc, 0, 0, CopyPixelOperation.SourceCopy | CopyPixelOperation.CaptureBlt)) {
        CleanupGdiObjects(hwnd, hdcDest, hdcSrc, hBitmap, hOld);
        throw new Exception("Failed to capture window bitmap");
      }

      Bitmap bmp = Image.FromHbitmap(hBitmap);
      CleanupGdiObjects(hwnd, hdcDest, hdcSrc, hBitmap, hOld);
      return bmp;
    }

    private static void CleanupGdiObjects(IntPtr hwnd, IntPtr hdcDest, IntPtr hdcSrc, IntPtr hBitmap, IntPtr hOld) {
      SelectObject(hdcDest, hOld);
      DeleteDC(hdcDest);
      ReleaseDC(hwnd, hdcSrc);
      DeleteObject(hBitmap);
    }

    public static IntPtr GetHwnd() {
      if (WINDOW_ID != IntPtr.Zero) return WINDOW_ID;

      IntPtr hwnd = FindWindow(null, WINDOW_NAME);
      WINDOW_ID = hwnd;

      if (WINDOW_ID == IntPtr.Zero) throw new Exception("Window not found");
      return WINDOW_ID;
    }

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string? lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr SelectObject(IntPtr hdc, IntPtr bmp);

    [DllImport("gdi32.dll")]
    private static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSource, int xSrc, int ySrc, CopyPixelOperation rop);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT {
      public int Left;
      public int Top;
      public int Right;
      public int Bottom;
    }
  }
}
