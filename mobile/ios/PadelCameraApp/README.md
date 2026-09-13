# PadelCameraApp — Milestones 2–3: capability detection + single-camera preview

Scope (per `docs/padel-camera-architecture.md`):
- **Milestone 2** (§14): detect what a device's cameras can actually do — rear
  camera(s) present, multi-cam support, supported formats/FPS — and show it on a debug
  screen.
- **Milestone 3**: open one physical camera and show its live feed.

**Still out of scope:** dual-camera capture (Milestone 4), recording, calibration,
backend calls, scoring.

## Files

- `Camera/CameraCapabilities.swift` — the `CameraCapabilities`/`CameraDeviceInfo`/
  `CameraFormatInfo` models and the `RecommendedCaptureConfiguration` fallback chain
  (wide+ultra-wide → wide only → ultra-wide only → unsupported).
- `Camera/CameraCaptureService.swift` — `capabilities()`, which queries
  `AVCaptureDevice.DiscoverySession` and `AVCaptureMultiCamSession.isMultiCamSupported`
  fresh every call (never cached/hardcoded per device model).
- `Camera/SingleCameraCaptureController.swift` — Milestone 3: opens one
  `AVCaptureSession` on the best available camera and publishes running/error state.
- `UI/CapabilitiesDebugView.swift` — the Milestone 2 developer/debug screen.
- `UI/CameraPreviewView.swift` — `UIViewRepresentable` bridge exposing
  `AVCaptureVideoPreviewLayer` to SwiftUI.
- `UI/SingleCameraPreviewScreen.swift` — the Milestone 3 live-preview screen.
- `App/PadelCameraAppApp.swift` — app entry point; a two-tab app (Capabilities /
  Preview).

## Running this on your iPad/iPhone via Swift Playgrounds

Swift Playgrounds' "App Playground" project format (`.swiftpm`) is a bit particular
about how `Package.swift` declares capabilities, and that surface changes across
Playgrounds versions — rather than hand-craft a `Package.swift` that might not match
your installed version, do this instead (more reliable, ~3 minutes):

1. On your iPad, open **Swift Playgrounds** → **+** → **App** (not "Playground" — you
   want the App Playground template, which builds a real installable app).
2. Name it `PadelCameraApp`.
3. In the file navigator, delete the template's default `ContentView.swift` (keep the
   generated `PadelCameraAppApp.swift`/`@main` file — you'll overwrite its contents).
4. Create three groups matching this repo: `Camera`, `UI`, and one file at the top level
   for the app entry (or just keep the generated one).
5. Copy the contents of each file above into a matching new file in Swift Playgrounds:
   - `Camera/CameraCapabilities.swift`
   - `Camera/CameraCaptureService.swift`
   - `UI/CapabilitiesDebugView.swift`
   - Replace the generated app-entry file's contents with `App/PadelCameraAppApp.swift`.
6. Add camera permission: tap the project name at the top of the file navigator → **App
   Info** (or the ⚙️ **Settings** icon, depending on your Playgrounds version) → find
   **Privacy** / **Capabilities** → enable **Camera**, and set the usage description to
   something like: *"PadelCameraApp needs camera access to detect this device's capture
   capabilities."* (This is the GUI equivalent of `NSCameraUsageDescription` — Swift
   Playgrounds does not let you hand-edit `Info.plist` directly in most versions.)
7. Connect your iPhone to the same Apple ID as the iPad (or have it nearby on the same
   Wi-Fi/Bluetooth), tap **Run** in Swift Playgrounds, and pick your iPhone as the
   destination device when prompted. First run on a physical device may ask you to
   trust the developer certificate on the iPhone: **Settings → General → VPN & Device
   Management** on the iPhone.
8. Grant the camera permission prompt when the app launches, and the debug screen
   should populate immediately.

## What to expect on different devices

- **iPad Air** (no ultra-wide rear lens): expect `Wide only` as the recommendation on
  the Capabilities tab — this is the correct, expected result, not a bug. It's a real
  validation of the fallback chain in §14. The Preview tab should show a live feed from
  the single wide rear camera.
- **iPhone Pro / Pro Max, or iPad Pro 11"/12.9" (2020+)**: if `isMultiCamSupported` is
  `Yes` and both a wide and ultra-wide rear camera are listed, the Capabilities tab
  should show `Wide + Ultra-wide (dual rear capture)` — this is the only real test of
  true Milestone 4 hardware support (still not implemented — this app still only opens
  one camera at a time even on this hardware).

## Not in scope here

Dual-camera capture, frame synchronization, recording, calibration, and everything else
is Milestone 4 onward — intentionally not touched by this file set.
