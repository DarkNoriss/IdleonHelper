using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using OpenCvSharp;
using OpenCvSharp.Extensions;
using Vortice.Direct3D;
using Vortice.Direct3D11;
using Vortice.DXGI;
using Windows.Graphics;
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX;
using Windows.Graphics.DirectX.Direct3D11;
using WinRT;

namespace IdleonHelperBackend.Utils;

[SupportedOSPlatform("windows10.0.19041.0")]
public class WindowCapture : IDisposable
{
    private const string WindowName = "Legends Of Idleon";
    private const int WindowHeight = 572;
    private const int WindowWidth = 960;
    private const int ResizeDelayMs = 50;
    private const int CaptureTimeoutMs = 2000;

    private static IntPtr _cachedWindowHandle = IntPtr.Zero;
    private static WindowCapture? _instance;
    private static readonly object _lock = new();

    private ID3D11Device? _d3dDevice;
    private ID3D11DeviceContext? _d3dContext;
    private IDirect3DDevice? _wrtDevice;

    private GraphicsCaptureItem? _captureItem;
    private Direct3D11CaptureFramePool? _framePool;
    private GraphicsCaptureSession? _captureSession;
    private SizeInt32 _lastSize;
    private bool _disposed;

    private WindowCapture()
    {
        InitializeD3D11();
    }

    public static Mat CaptureScreenShot(CancellationToken ct)
    {
        var hwnd = GetWindowHandle();
        EnsureCorrectWindowSize(hwnd, ct);
        var instance = GetInstance();
        return instance.CaptureWindow(hwnd, ct);
    }

    public static Mat CaptureScreenShotColor(CancellationToken ct)
    {
        var hwnd = GetWindowHandle();
        EnsureCorrectWindowSize(hwnd, ct);
        var instance = GetInstance();
        return instance.CaptureWindowColor(hwnd, ct);
    }

    public static IntPtr GetWindowHandle()
    {
        if (_cachedWindowHandle != IntPtr.Zero && IsWindow(_cachedWindowHandle))
            return _cachedWindowHandle;

        _cachedWindowHandle = FindWindow(null, WindowName);

        return _cachedWindowHandle == IntPtr.Zero
            ? throw new InvalidOperationException($"Window '{WindowName}' not found")
            : _cachedWindowHandle;
    }

    private static WindowCapture GetInstance()
    {
        if (_instance != null && !_instance._disposed)
            return _instance;

        lock (_lock)
        {
            if (_instance == null || _instance._disposed)
            {
                _instance?.Dispose();
                _instance = new WindowCapture();
            }
        }

        return _instance;
    }

    private static void EnsureCorrectWindowSize(IntPtr hwnd, CancellationToken ct)
    {
        var (width, height) = GetWindowSize(hwnd);

        if (width == WindowWidth && height == WindowHeight)
            return;

        ResizeWindow(hwnd, ct);
    }

    private static (int width, int height) GetWindowSize(IntPtr hwnd)
    {
        return !GetWindowRect(hwnd, out var rect)
            ? throw new InvalidOperationException("Failed to get window size")
            : (rect.Right - rect.Left, rect.Bottom - rect.Top);
    }

    private static void ResizeWindow(IntPtr hwnd, CancellationToken ct)
    {
        GetWindowRect(hwnd, out var rect);
        MoveWindow(hwnd, rect.Left, rect.Top, WindowWidth, WindowHeight, true);
        Task.Delay(ResizeDelayMs, ct).Wait(ct);
    }

    private void InitializeD3D11()
    {
        D3D11.D3D11CreateDevice(
            null,
            DriverType.Hardware,
            DeviceCreationFlags.BgraSupport,
            [FeatureLevel.Level_11_1, FeatureLevel.Level_11_0],
            out _d3dDevice,
            out _d3dContext);

        if (_d3dDevice == null)
            throw new InvalidOperationException("Failed to create D3D11 device");

        using var dxgiDevice = _d3dDevice.QueryInterface<IDXGIDevice>();
        _wrtDevice = CreateDirect3DDevice(dxgiDevice!);
    }

    private void InitializeCaptureForWindow(IntPtr hwnd)
    {
        if (!GraphicsCaptureSession.IsSupported())
            throw new PlatformNotSupportedException("Windows.Graphics.Capture is not supported on this device");

        CleanupCaptureResources();

        _captureItem = CreateCaptureItemForWindow(hwnd);

        if (_captureItem == null)
            throw new InvalidOperationException("Failed to create capture item for window");

        _lastSize = _captureItem.Size;

        _framePool = Direct3D11CaptureFramePool.CreateFreeThreaded(
            _wrtDevice!,
            DirectXPixelFormat.B8G8R8A8UIntNormalized,
            1,
            _lastSize);

        _captureSession = _framePool.CreateCaptureSession(_captureItem);
        _captureSession.IsCursorCaptureEnabled = false;

        TryDisableBorder(_captureSession);
    }

    private static void TryDisableBorder(GraphicsCaptureSession session)
    {
        try
        {
            var winrtObj = (IWinRTObject)session;
            var sessionPtr = winrtObj.NativeObject.ThisPtr;

            var session2Guid = new Guid("2C39AE40-7D2E-5044-804E-8B6799D4CF9E");
            var hr = Marshal.QueryInterface(sessionPtr, in session2Guid, out var session2Ptr);

            if (hr != 0)
                return;

            try
            {
                var vtablePtr = Marshal.ReadIntPtr(session2Ptr);
                var putIsBorderRequiredPtr = Marshal.ReadIntPtr(vtablePtr, 7 * IntPtr.Size);

                var putDelegate = Marshal.GetDelegateForFunctionPointer<PutBoolPropertyDelegate>(putIsBorderRequiredPtr);
                putDelegate(session2Ptr, 0);
            }
            finally
            {
                Marshal.Release(session2Ptr);
            }
        }
        catch
        {
            // Border disable not available on this Windows version
        }
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int PutBoolPropertyDelegate(IntPtr thisPtr, byte value);

    private Mat CaptureWindow(IntPtr hwnd, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (_captureItem == null || _framePool == null || _captureSession == null)
            InitializeCaptureForWindow(hwnd);

        var frameTask = new TaskCompletionSource<Direct3D11CaptureFrame?>();

        void OnFrameArrived(Direct3D11CaptureFramePool sender, object args)
        {
            var frame = sender.TryGetNextFrame();
            frameTask.TrySetResult(frame);
        }

        _framePool!.FrameArrived += OnFrameArrived;

        try
        {
            _captureSession!.StartCapture();

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(CaptureTimeoutMs);

            Direct3D11CaptureFrame? frame = null;
            try
            {
                var completed = frameTask.Task.Wait(CaptureTimeoutMs, ct);
                if (completed)
                    frame = frameTask.Task.Result;
                else
                    throw new TimeoutException("Capture frame timeout - no frame received");
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException("Capture frame timeout - operation cancelled");
            }
            catch (AggregateException ae)
            {
                throw ae.InnerException ?? ae;
            }

            if (frame == null)
                throw new InvalidOperationException("Failed to capture frame - frame is null");

            using (frame)
            {
                using var bitmap = ConvertFrameToBitmap(frame);
                return bitmap.ToMat().CvtColor(ColorConversionCodes.BGR2GRAY);
            }
        }
        finally
        {
            _framePool!.FrameArrived -= OnFrameArrived;
            CleanupCaptureResources();
        }
    }

    private Mat CaptureWindowColor(IntPtr hwnd, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (_captureItem == null || _framePool == null || _captureSession == null)
            InitializeCaptureForWindow(hwnd);

        var frameTask = new TaskCompletionSource<Direct3D11CaptureFrame?>();

        void OnFrameArrived(Direct3D11CaptureFramePool sender, object args)
        {
            var frame = sender.TryGetNextFrame();
            frameTask.TrySetResult(frame);
        }

        _framePool!.FrameArrived += OnFrameArrived;

        try
        {
            _captureSession!.StartCapture();

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(CaptureTimeoutMs);

            Direct3D11CaptureFrame? frame = null;
            try
            {
                var completed = frameTask.Task.Wait(CaptureTimeoutMs, ct);
                if (completed)
                    frame = frameTask.Task.Result;
                else
                    throw new TimeoutException("Capture frame timeout - no frame received");
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException("Capture frame timeout - operation cancelled");
            }
            catch (AggregateException ae)
            {
                throw ae.InnerException ?? ae;
            }

            if (frame == null)
                throw new InvalidOperationException("Failed to capture frame - frame is null");

            using (frame)
            {
                using var bitmap = ConvertFrameToBitmap(frame);
                return bitmap.ToMat();
            }
        }
        finally
        {
            _framePool!.FrameArrived -= OnFrameArrived;
            CleanupCaptureResources();
        }
    }

    private unsafe Bitmap ConvertFrameToBitmap(Direct3D11CaptureFrame frame)
    {
        using var surfaceTexture = GetTextureFromSurface(frame.Surface);

        var desc = surfaceTexture.Description;

        var stagingDesc = new Texture2DDescription
        {
            Width = desc.Width,
            Height = desc.Height,
            MipLevels = 1,
            ArraySize = 1,
            Format = desc.Format,
            SampleDescription = new SampleDescription(1, 0),
            Usage = ResourceUsage.Staging,
            BindFlags = BindFlags.None,
            CPUAccessFlags = CpuAccessFlags.Read,
            MiscFlags = ResourceOptionFlags.None
        };

        using var stagingTexture = _d3dDevice!.CreateTexture2D(stagingDesc);

        _d3dContext!.CopyResource(stagingTexture, surfaceTexture);

        var mappedResource = _d3dContext.Map(stagingTexture, 0, MapMode.Read, Vortice.Direct3D11.MapFlags.None);

        try
        {
            var bitmap = new Bitmap((int)desc.Width, (int)desc.Height, PixelFormat.Format32bppArgb);
            var bitmapData = bitmap.LockBits(
                new Rectangle(0, 0, bitmap.Width, bitmap.Height),
                ImageLockMode.WriteOnly,
                PixelFormat.Format32bppArgb);

            try
            {
                var sourcePtr = mappedResource.DataPointer;
                var destPtr = bitmapData.Scan0;
                var copyWidth = Math.Min(bitmapData.Stride, (int)mappedResource.RowPitch);
                var actualRowBytes = (int)desc.Width * 4;
                var rowSize = Math.Min(actualRowBytes, copyWidth);

                for (var y = 0; y < desc.Height; y++)
                {
                    Buffer.MemoryCopy(
                        (void*)(sourcePtr + y * mappedResource.RowPitch),
                        (void*)(destPtr + y * bitmapData.Stride),
                        bitmapData.Stride,
                        rowSize);
                }
            }
            finally
            {
                bitmap.UnlockBits(bitmapData);
            }

            return bitmap;
        }
        finally
        {
            _d3dContext.Unmap(stagingTexture, 0);
        }
    }

    private ID3D11Texture2D GetTextureFromSurface(IDirect3DSurface surface)
    {
        var winrtObject = (IWinRTObject)surface;
        var nativePtr = winrtObject.NativeObject.ThisPtr;

        var accessGuid = typeof(IDirect3DDxgiInterfaceAccess).GUID;
        var hr = Marshal.QueryInterface(nativePtr, in accessGuid, out var accessPtr);

        if (hr != 0)
            throw new COMException($"Failed to get IDirect3DDxgiInterfaceAccess: HRESULT {hr}", hr);

        try
        {
            var access = (IDirect3DDxgiInterfaceAccess)Marshal.GetObjectForIUnknown(accessPtr);
            var textureGuid = typeof(ID3D11Texture2D).GUID;

            var texturePtr = access.GetInterface(ref textureGuid);

            if (texturePtr == IntPtr.Zero)
                throw new InvalidOperationException("GetInterface returned null pointer");

            return new ID3D11Texture2D(texturePtr);
        }
        finally
        {
            Marshal.Release(accessPtr);
        }
    }

    private static GraphicsCaptureItem CreateCaptureItemForWindow(IntPtr hwnd)
    {
        var factoryGuid = typeof(IGraphicsCaptureItemInterop).GUID;
        var className = "Windows.Graphics.Capture.GraphicsCaptureItem";

        var hr = WindowsCreateString(className, className.Length, out var hstring);

        if (hr != 0)
            throw new COMException($"Failed to create HSTRING: HRESULT {hr}", hr);

        try
        {
            hr = RoGetActivationFactory(hstring, ref factoryGuid, out var factoryPtr);

            if (hr != 0 || factoryPtr == IntPtr.Zero)
                throw new COMException($"Failed to get activation factory: HRESULT {hr}", hr);

            try
            {
                var interop = (IGraphicsCaptureItemInterop)Marshal.GetObjectForIUnknown(factoryPtr);
                var itemGuid = new Guid("79C3F95B-31F7-4EC2-A464-632EF5D30760");

                var itemPtr = interop.CreateForWindow(hwnd, ref itemGuid);

                if (itemPtr == IntPtr.Zero)
                    throw new InvalidOperationException("CreateForWindow returned null");

                return MarshalInterface<GraphicsCaptureItem>.FromAbi(itemPtr)
                    ?? throw new InvalidOperationException("Failed to marshal GraphicsCaptureItem");
            }
            finally
            {
                Marshal.Release(factoryPtr);
            }
        }
        finally
        {
            WindowsDeleteString(hstring);
        }
    }

    private static IDirect3DDevice CreateDirect3DDevice(IDXGIDevice dxgiDevice)
    {
        var hr = CreateDirect3D11DeviceFromDXGIDevice(dxgiDevice.NativePointer, out var graphicsDevice);

        if (hr != 0)
            throw new InvalidOperationException($"Failed to create Direct3D11 device from DXGI device: HRESULT {hr}");

        return MarshalInterface<IDirect3DDevice>.FromAbi(graphicsDevice)
            ?? throw new InvalidOperationException("Failed to marshal IDirect3DDevice");
    }

    private void CleanupCaptureResources()
    {
        _captureSession?.Dispose();
        _captureSession = null;

        _framePool?.Dispose();
        _framePool = null;

        _captureItem = null;
    }

    public void Dispose()
    {
        if (_disposed) return;

        CleanupCaptureResources();

        _wrtDevice = null;
        _d3dContext?.Dispose();
        _d3dContext = null;
        _d3dDevice?.Dispose();
        _d3dDevice = null;

        _disposed = true;
        GC.SuppressFinalize(this);
    }

    #region COM Interop

    [ComImport]
    [Guid("A9B3D012-3DF2-4EE3-B8D1-8695F457D3C1")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IDirect3DDxgiInterfaceAccess
    {
        IntPtr GetInterface(ref Guid iid);
    }

    [ComImport]
    [Guid("3628E81B-3CAC-4C60-B7F4-23CE0E0C3356")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IGraphicsCaptureItemInterop
    {
        IntPtr CreateForWindow(IntPtr window, ref Guid iid);
        IntPtr CreateForMonitor(IntPtr monitor, ref Guid iid);
    }

    #endregion

    #region P/Invoke

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string? lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out Rect lpRect);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool MoveWindow(IntPtr hWnd, int x, int y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr hWnd);

    [DllImport("d3d11.dll", EntryPoint = "CreateDirect3D11DeviceFromDXGIDevice")]
    private static extern int CreateDirect3D11DeviceFromDXGIDevice(IntPtr dxgiDevice, out IntPtr graphicsDevice);

    [DllImport("combase.dll", PreserveSig = true)]
    private static extern int WindowsCreateString(
        [MarshalAs(UnmanagedType.LPWStr)] string sourceString,
        int length,
        out IntPtr hstring);

    [DllImport("combase.dll", PreserveSig = true)]
    private static extern int WindowsDeleteString(IntPtr hstring);

    [DllImport("combase.dll", PreserveSig = true)]
    private static extern int RoGetActivationFactory(
        IntPtr activatableClassId,
        ref Guid iid,
        out IntPtr factory);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    #endregion
}
