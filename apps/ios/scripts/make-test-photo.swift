// Writes a JPEG with the EXIF a phone camera adds (date taken and GPS), for
// the photo-first logging UI test: `swift scripts/make-test-photo.swift out.jpg`.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let width = 1200, height = 900
let space = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.35, green: 0.08, blue: 0.1, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
ctx.setFillColor(CGColor(red: 0.95, green: 0.75, blue: 0.3, alpha: 1))
ctx.fill(CGRect(x: 200, y: 150, width: 800, height: 600))
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
let props: [CFString: Any] = [
  kCGImagePropertyExifDictionary: [kCGImagePropertyExifDateTimeOriginal: "2026:10:03 19:58:00"],
  kCGImagePropertyGPSDictionary: [
    kCGImagePropertyGPSLatitude: 40.75935, kCGImagePropertyGPSLatitudeRef: "N",
    kCGImagePropertyGPSLongitude: 73.98680, kCGImagePropertyGPSLongitudeRef: "W",
    kCGImagePropertyGPSHPositioningError: 10.0,
  ],
]
CGImageDestinationAddImage(dest, ctx.makeImage()!, props as CFDictionary)
CGImageDestinationFinalize(dest)
print("Wrote \(out.path)")
