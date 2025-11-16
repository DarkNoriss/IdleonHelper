import koffi from "koffi"

// Window name constant
export const WINDOW_NAME = "Legends Of Idleon"

// Load user32.dll
const user32 = koffi.load("user32.dll")

// Define FindWindowW function
// HWND FindWindowW(LPCWSTR lpClassName, LPCWSTR lpWindowName)
const FindWindowW = user32.func("FindWindowW", "void*", ["str16", "str16"])

// Function to find window by class name and/or window title
// Returns HWND as string (address), or null if not found
export function findWindow(
  className: string | null = null,
  windowName: string | null = WINDOW_NAME
): string | null {
  try {
    // Call FindWindowW
    const hwnd = FindWindowW(className, windowName)

    // Check if window was found (null or 0 means not found)
    if (!hwnd || koffi.address(hwnd) === BigInt(0)) {
      return null
    }

    // Get the actual memory address as a string
    const hwndAddress = koffi.address(hwnd)
    return hwndAddress.toString()
  } catch (error) {
    console.error("Error finding window:", error)
    return null
  }
}
