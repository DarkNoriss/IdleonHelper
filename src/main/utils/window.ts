import koffi from "koffi"

// Window name constant
export const WINDOW_NAME = "Legends Of Idleon"

// Type for void pointer (HWND)
type VoidPtr = unknown

// Load user32.dll
const user32 = koffi.load("user32.dll")

// Define FindWindowW function
// HWND FindWindowW(LPCWSTR lpClassName, LPCWSTR lpWindowName)
const FindWindowW = user32.func("FindWindowW", "void*", ["str16", "str16"])

// Define IsWindow function to validate window handle
// BOOL IsWindow(HWND hWnd)
const IsWindow = user32.func("IsWindow", "bool", ["void*"])

// Cache for window handle to avoid repeated FindWindow calls
let cachedHwnd: VoidPtr | null = null

// Validate if cached window handle is still valid
// Returns true if cache exists and window is still valid, false otherwise
function isCachedWindowValid(): boolean {
  if (cachedHwnd === null) {
    return false
  }

  try {
    const address = koffi.address(cachedHwnd)
    if (address === BigInt(0)) {
      cachedHwnd = null
      return false
    }

    // Check if window still exists using IsWindow API
    const isValid = IsWindow(cachedHwnd)
    if (!isValid) {
      cachedHwnd = null
      return false
    }

    return true
  } catch {
    // If validation fails, clear cache and return false
    cachedHwnd = null
    return false
  }
}

// Function to find window by class name and/or window title
// Returns HWND pointer (void*), or null if not found
// Always caches the result for performance - only calls FindWindow when cache is invalid
export const findWindow = (
  className: string | null = null,
  windowName: string | null = WINDOW_NAME
): VoidPtr | null => {
  // Return cached HWND if available and still valid (no FindWindow call needed)
  if (isCachedWindowValid()) {
    return cachedHwnd
  }

  // Cache is invalid or doesn't exist, fetch new window handle
  try {
    // Call FindWindowW
    const hwnd = FindWindowW(className, windowName) as VoidPtr

    // Check if window was found (null or 0 means not found)
    if (!hwnd || koffi.address(hwnd) === BigInt(0)) {
      cachedHwnd = null
      return null
    }

    // Validate the new window handle using IsWindow
    const isValid = IsWindow(hwnd)
    if (!isValid) {
      cachedHwnd = null
      return null
    }

    // Cache the valid HWND for future calls
    cachedHwnd = hwnd
    return hwnd
  } catch (error) {
    console.error("Error finding window:", error)
    cachedHwnd = null
    return null
  }
}

// Clear the cached window handle (useful when window closes)
export const clearWindowCache = (): void => {
  cachedHwnd = null
}

// Helper function to convert HWND to string for IPC
export const hwndToString = (hwnd: VoidPtr | null): string | null => {
  if (!hwnd) {
    return null
  }
  return koffi.address(hwnd).toString()
}
