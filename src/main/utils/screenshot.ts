import fs from "fs"
import koffi from "koffi"

// Type for void pointer (HWND)
type VoidPtr = unknown

const user32 = koffi.load("user32.dll")
const gdi32 = koffi.load("gdi32.dll")

// Define RECT structure
const RECT = koffi.struct("RECT", {
  left: "long",
  top: "long",
  right: "long",
  bottom: "long",
})

// Define BITMAPINFOHEADER structure
const BITMAPINFOHEADER = koffi.struct("BITMAPINFOHEADER", {
  biSize: "uint32",
  biWidth: "int32",
  biHeight: "int32",
  biPlanes: "uint16",
  biBitCount: "uint16",
  biCompression: "uint32",
  biSizeImage: "uint32",
  biXPelsPerMeter: "int32",
  biYPelsPerMeter: "int32",
  biClrUsed: "uint32",
  biClrImportant: "uint32",
})

// Window functions
const GetWindowRect = user32.func("GetWindowRect", "bool", [
  "void*",
  koffi.out(koffi.pointer(RECT)),
])
const GetDC = user32.func("GetDC", "void*", ["void*"])
const ReleaseDC = user32.func("ReleaseDC", "int", ["void*", "void*"])

// GDI functions for screenshot
const CreateCompatibleDC = gdi32.func("CreateCompatibleDC", "void*", ["void*"])
const CreateCompatibleBitmap = gdi32.func("CreateCompatibleBitmap", "void*", [
  "void*",
  "int",
  "int",
])
const SelectObject = gdi32.func("SelectObject", "void*", ["void*", "void*"])
const BitBlt = gdi32.func("BitBlt", "bool", [
  "void*",
  "int",
  "int",
  "int",
  "int",
  "void*",
  "int",
  "int",
  "uint",
])
const DeleteObject = gdi32.func("DeleteObject", "bool", ["void*"])
const DeleteDC = gdi32.func("DeleteDC", "bool", ["void*"])
const GetDIBits = gdi32.func("GetDIBits", "int", [
  "void*",
  "void*",
  "uint",
  "uint",
  "void*",
  koffi.pointer(BITMAPINFOHEADER),
  "uint",
])

// Constants
const SRCCOPY = 0x00cc0020
const CAPTUREBLT = 0x40000000
const DIB_RGB_COLORS = 0

// Get window rectangle
function getWindowRect(hwnd: VoidPtr): {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
} | null {
  const rect = {} as {
    left: number
    top: number
    right: number
    bottom: number
  }
  const success = GetWindowRect(hwnd, rect)

  if (success) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    }
  }
  return null
}

// Create BMP file header
function createBMPHeader(
  width: number,
  height: number,
  dataSize: number
): Buffer {
  const fileSize = 54 + dataSize // 54 bytes header + pixel data
  const header = Buffer.alloc(54)

  // BMP File Header (14 bytes)
  header.write("BM", 0) // Signature
  header.writeUInt32LE(fileSize, 2) // File size
  header.writeUInt32LE(0, 6) // Reserved
  header.writeUInt32LE(54, 10) // Pixel data offset

  // DIB Header (40 bytes)
  header.writeUInt32LE(40, 14) // DIB header size
  header.writeInt32LE(width, 18) // Width
  header.writeInt32LE(height, 22) // Height (positive = bottom-up)
  header.writeUInt16LE(1, 26) // Planes
  header.writeUInt16LE(24, 28) // Bits per pixel (24-bit RGB)
  header.writeUInt32LE(0, 30) // Compression (none)
  header.writeUInt32LE(dataSize, 34) // Image size
  header.writeInt32LE(0, 38) // X pixels per meter
  header.writeInt32LE(0, 42) // Y pixels per meter
  header.writeUInt32LE(0, 46) // Colors used
  header.writeUInt32LE(0, 50) // Important colors

  return header
}

// Cleanup GDI objects (matches C# pattern for proper resource management)
function cleanupGdiObjects(
  hdcDest: VoidPtr | null,
  hdcSrc: VoidPtr | null,
  hBitmap: VoidPtr | null,
  hOld: VoidPtr | null,
  hwnd: VoidPtr | null
): void {
  try {
    // Restore old object first (proper GDI practice)
    if (hdcDest && hOld) {
      SelectObject(hdcDest, hOld)
    }
    // Delete memory DC
    if (hdcDest) {
      DeleteDC(hdcDest)
    }
    // Release window DC
    if (hwnd && hdcSrc) {
      ReleaseDC(hwnd, hdcSrc)
    }
    // Delete bitmap object
    if (hBitmap) {
      DeleteObject(hBitmap)
    }
  } catch (error) {
    // Silently handle cleanup errors to prevent masking original errors
    console.error("Error during GDI cleanup:", error)
  }
}

// Convert BGRA to BGR (remove alpha and reverse rows for BMP)
// Optimized for performance with pre-calculated values
function bgraToBGR(buffer: Buffer, width: number, height: number): Buffer {
  const rowSize = width * 3
  const paddedRowSize = Math.ceil(rowSize / 4) * 4 // BMP rows must be padded to 4 bytes
  const bgrBuffer = Buffer.alloc(paddedRowSize * height)

  // Pre-calculate common values outside loops
  const width4 = width * 4

  for (let y = 0; y < height; y++) {
    const srcRowStart = y * width4
    const dstRowStart = (height - 1 - y) * paddedRowSize

    for (let x = 0; x < width; x++) {
      const srcIndex = srcRowStart + x * 4 // BGRA
      const dstIndex = dstRowStart + x * 3 // BGR

      bgrBuffer[dstIndex] = buffer[srcIndex] // B
      bgrBuffer[dstIndex + 1] = buffer[srcIndex + 1] // G
      bgrBuffer[dstIndex + 2] = buffer[srcIndex + 2] // R
    }
  }

  return bgrBuffer
}

// Capture window screenshot and save to BMP file
// Optimized for performance with proper error handling and resource cleanup
export const captureWindowToFile = async (
  hwnd: VoidPtr,
  filepath: string
): Promise<boolean> => {
  // Initialize GDI handles to null for proper cleanup tracking
  let hdcWindow: VoidPtr | null = null
  let hdcMemDC: VoidPtr | null = null
  let hbmScreen: VoidPtr | null = null
  let hOld: VoidPtr | null = null

  try {
    // Get window dimensions
    const rect = getWindowRect(hwnd)
    if (!rect) {
      console.error("Failed to get window rect")
      return false
    }

    const width = rect.width
    const height = rect.height

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.error(`Invalid window dimensions: ${width}x${height}`)
      return false
    }

    console.log(`Capturing window: ${width}x${height}`)

    // Get device context (GetDC is faster - captures client area only)
    hdcWindow = GetDC(hwnd)
    if (!hdcWindow || koffi.address(hdcWindow) === BigInt(0)) {
      console.error("Failed to get device context")
      return false
    }

    // Create compatible DC and bitmap
    hdcMemDC = CreateCompatibleDC(hdcWindow)
    if (!hdcMemDC || koffi.address(hdcMemDC) === BigInt(0)) {
      console.error("Failed to create compatible DC")
      cleanupGdiObjects(null, hdcWindow, null, null, hwnd)
      return false
    }

    hbmScreen = CreateCompatibleBitmap(hdcWindow, width, height)
    if (!hbmScreen || koffi.address(hbmScreen) === BigInt(0)) {
      console.error("Failed to create compatible bitmap")
      cleanupGdiObjects(hdcMemDC, hdcWindow, null, null, hwnd)
      return false
    }

    // Select bitmap into DC and save old object
    hOld = SelectObject(hdcMemDC, hbmScreen)

    // Copy window content to memory DC (CaptureBlt flag for layered windows)
    const bitBltSuccess = BitBlt(
      hdcMemDC,
      0,
      0,
      width,
      height,
      hdcWindow,
      0,
      0,
      SRCCOPY | CAPTUREBLT
    )

    if (!bitBltSuccess) {
      console.error("BitBlt failed to copy window content")
      cleanupGdiObjects(hdcMemDC, hdcWindow, hbmScreen, hOld, hwnd)
      return false
    }

    // Setup BITMAPINFOHEADER (reusable struct definition)
    const bmi: {
      biSize: number
      biWidth: number
      biHeight: number
      biPlanes: number
      biBitCount: number
      biCompression: number
      biSizeImage: number
      biXPelsPerMeter: number
      biYPelsPerMeter: number
      biClrUsed: number
      biClrImportant: number
    } = {
      biSize: 40,
      biWidth: width,
      biHeight: -height, // negative for top-down bitmap
      biPlanes: 1,
      biBitCount: 32,
      biCompression: 0,
      biSizeImage: 0,
      biXPelsPerMeter: 0,
      biYPelsPerMeter: 0,
      biClrUsed: 0,
      biClrImportant: 0,
    }

    // Allocate buffer for pixel data (BGRA format)
    const bufferSize = width * height * 4
    const buffer = Buffer.alloc(bufferSize)

    // Get bitmap bits (GetDIBits is faster than FromHbitmap wrapper - direct API call)
    const result = GetDIBits(
      hdcMemDC,
      hbmScreen,
      0,
      height,
      buffer,
      bmi,
      DIB_RGB_COLORS
    )

    // Cleanup GDI objects before processing (free resources early)
    cleanupGdiObjects(hdcMemDC, hdcWindow, hbmScreen, hOld, hwnd)
    hdcMemDC = null
    hdcWindow = null
    hbmScreen = null
    hOld = null

    if (result === 0) {
      console.error("GetDIBits failed to extract bitmap data")
      return false
    }

    // Convert BGRA to BGR and flip for BMP format
    const bgrBuffer = bgraToBGR(buffer, width, height)

    // Create BMP header
    const header = createBMPHeader(width, height, bgrBuffer.length)

    // Write to file (single allocation for better performance)
    const fileBuffer = Buffer.concat([header, bgrBuffer])
    fs.writeFileSync(filepath, fileBuffer)

    console.log(`Screenshot saved to: ${filepath}`)
    console.log(`File size: ${fileBuffer.length} bytes`)

    return true
  } catch (error) {
    console.error("Error capturing window:", error)
    // Ensure cleanup on exception
    cleanupGdiObjects(hdcMemDC, hdcWindow, hbmScreen, hOld, hwnd)
    return false
  }
}
