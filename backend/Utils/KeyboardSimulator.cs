using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace IdleonHelperBackend.Utils;

[SupportedOSPlatform("windows10.0.19041.0")]
public static class KeyboardSimulator
{
  public static async Task KeyPress(int virtualKeyCode, CancellationToken ct, int holdTime = 50)
  {
    ct.ThrowIfCancellationRequested();

    var hWnd = WindowCapture.GetWindowHandle();

    PostMessage(hWnd, WmKeydown, (IntPtr)virtualKeyCode, IntPtr.Zero);
    await Task.Delay(holdTime, ct);
    PostMessage(hWnd, WmKeyup, (IntPtr)virtualKeyCode, IntPtr.Zero);
  }

  private const uint WmKeydown = 0x0100;
  private const uint WmKeyup = 0x0101;

  [DllImport("User32.dll")]
  private static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
}
