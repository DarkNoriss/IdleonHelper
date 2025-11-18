using System.Drawing;
using System.Runtime.InteropServices;
using OpenCvSharp;
using OpenCvSharp.Extensions;

namespace IdleonBotBackend.Utils;

public class WindowCapture {
    private const string WINDOW_NAME = "Legends Of Idleon";
    private const int WINDOW_HEIGHT = 572;
    private const int WINDOW_WIDTH = 960;
    private const int RESIZE_DELAY_MS = 50;
    
    private static IntPtr _cachedWindowHandle = IntPtr.Zero;
    private static IntPtr _cachedHdcSrc = IntPtr.Zero;
    private static IntPtr _cachedHdcDest = IntPtr.Zero;
    private static IntPtr _cachedHBitmap = IntPtr.Zero;
    private static int _cachedWidth = 0;
    private static int _cachedHeight = 0;

    public static Mat CaptureScreenShot(CancellationToken ct) {
        var hwnd = GetWindowHandle();
        EnsureCorrectWindowSize(hwnd, ct);

        var (width, height) = GetWindowSize(hwnd);
        using var bmp = CaptureWindowBitmap(hwnd, width, height);
        
        return bmp.ToMat().CvtColor(ColorConversionCodes.BGR2GRAY);
    }

    public static void CaptureAndDisplay(CancellationToken ct) {
        using var grayMat = CaptureScreenShot(ct);
        Cv2.ImShow("Window Capture", grayMat);
        Cv2.WaitKey(1);
    }

    private static IntPtr GetWindowHandle() {
        if (_cachedWindowHandle != IntPtr.Zero)
            return _cachedWindowHandle;

        _cachedWindowHandle = FindWindow(null, WINDOW_NAME);
        
        if (_cachedWindowHandle == IntPtr.Zero)
            throw new InvalidOperationException($"Window '{WINDOW_NAME}' not found");

        return _cachedWindowHandle;
    }

    private static void EnsureCorrectWindowSize(IntPtr hwnd, CancellationToken ct) {
        var (width, height) = GetWindowSize(hwnd);

        if (width == WINDOW_WIDTH && height == WINDOW_HEIGHT)
            return;

        ResizeWindow(hwnd, ct);
        ReleaseCachedGdiResources(); // Size changed, invalidate cache
    }

    private static (int width, int height) GetWindowSize(IntPtr hwnd) {
        if (!GetWindowRect(hwnd, out var rect))
            throw new InvalidOperationException("Failed to get window size");

        return (rect.Right - rect.Left, rect.Bottom - rect.Top);
    }

    private static void ResizeWindow(IntPtr hwnd, CancellationToken ct) {
        GetWindowRect(hwnd, out var rect);
        MoveWindow(hwnd, rect.Left, rect.Top, WINDOW_WIDTH, WINDOW_HEIGHT, true);
        Task.Delay(RESIZE_DELAY_MS, ct).Wait(ct);
    }

    private static Bitmap CaptureWindowBitmap(IntPtr hwnd, int width, int height) {
        // Initialize or reinitialize cached resources if dimensions changed
        if (_cachedHdcSrc == IntPtr.Zero || _cachedWidth != width || _cachedHeight != height) {
            ReleaseCachedGdiResources();
            InitializeCachedGdiResources(hwnd, width, height);
        }

        const int SRCCOPY_CAPTUREBLT = 0x00CC0020 | 0x40000000;
        
        if (!BitBlt(_cachedHdcDest, 0, 0, width, height, _cachedHdcSrc, 0, 0, SRCCOPY_CAPTUREBLT))
            throw new InvalidOperationException("Failed to capture window bitmap");

        return Image.FromHbitmap(_cachedHBitmap);
    }

    private static void InitializeCachedGdiResources(IntPtr hwnd, int width, int height) {
        _cachedHdcSrc = GetDC(hwnd);
        _cachedHdcDest = CreateCompatibleDC(_cachedHdcSrc);
        _cachedHBitmap = CreateCompatibleBitmap(_cachedHdcSrc, width, height);
        SelectObject(_cachedHdcDest, _cachedHBitmap);
        _cachedWidth = width;
        _cachedHeight = height;
    }

    private static void ReleaseCachedGdiResources() {
        if (_cachedHBitmap != IntPtr.Zero) {
            DeleteObject(_cachedHBitmap);
            _cachedHBitmap = IntPtr.Zero;
        }
        if (_cachedHdcDest != IntPtr.Zero) {
            DeleteDC(_cachedHdcDest);
            _cachedHdcDest = IntPtr.Zero;
        }
        if (_cachedHdcSrc != IntPtr.Zero) {
            ReleaseDC(_cachedWindowHandle, _cachedHdcSrc);
            _cachedHdcSrc = IntPtr.Zero;
        }
        _cachedWidth = 0;
        _cachedHeight = 0;
    }

    public static void Cleanup() {
        ReleaseCachedGdiResources();
        _cachedWindowHandle = IntPtr.Zero;
    }

    #region P/Invoke Declarations

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
    private static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, 
        IntPtr hdcSource, int xSrc, int ySrc, int rop);

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

    #endregion
}