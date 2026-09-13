# PadelCameraApp (Android) — Milestones 2–3: capability detection + single-camera preview

The Android counterpart to `mobile/ios/PadelCameraApp/`. Same scope, same milestone
numbering, same fallback-chain philosophy — different platform APIs.

- **Milestone 2** equivalent: detect what this device's cameras can actually do —
  rear camera(s) present, whether the OS reports true **concurrent** camera capture
  (`CameraManager.concurrentCameraIds`, API 30+ — Android's real equivalent of
  `AVCaptureMultiCamSession.isMultiCamSupported`), supported stream sizes/FPS.
- **Milestone 3** equivalent: open one camera via CameraX and show its live feed.

**Still out of scope:** true concurrent dual-camera capture (Milestone 4 equivalent),
recording, calibration, backend calls, scoring.

## Files

- `app/src/main/java/com/padelcameraapp/camera/CameraCapabilities.kt` — the data
  models and `RecommendedCaptureConfiguration` (concurrent rear capture → single rear
  only → unsupported).
- `app/src/main/java/com/padelcameraapp/camera/CameraCapabilityService.kt` —
  `capabilities()`, querying `CameraManager` fresh every call.
- `app/src/main/java/com/padelcameraapp/camera/SingleCameraController.kt` — binds a
  CameraX `Preview` use case to the best available camera.
- `app/src/main/java/com/padelcameraapp/ui/CapabilitiesScreen.kt` /
  `CameraPreviewScreen.kt` — the two Compose screens.
- `app/src/main/java/com/padelcameraapp/MainActivity.kt` — entry point, two-tab layout
  (Capabilities / Preview), mirroring the iOS app's `TabView`.

## Getting a build onto your phone — no Android Studio needed

Since Android debug builds are self-signed automatically and never expire, GitHub
Actions can hand you an installable APK directly:

1. Push (or wait for) a commit touching `mobile/android/` — the
   `.github/workflows/android-build.yml` workflow builds it automatically.
2. On GitHub: **Actions** tab → **Build Android debug APK** → open the latest run →
   scroll to **Artifacts** → download `padel-camera-app-debug` (a zip containing
   `app-debug.apk`).
3. Transfer that `.apk` file to your phone (email it to yourself, use a cloud drive,
   or plug the phone in and copy it over).
4. On the phone, open the file. Android will prompt to allow installing from this
   source the first time — allow it, then **Install**.
5. Open the app, grant the camera permission when the Preview tab asks for it.

No developer account, no expiry, no cable required (though a cable/`adb install` works
too if you prefer and have Android's platform-tools installed).

## What to expect

- Almost every phone will show **"Single rear camera only"** on the Capabilities tab —
  true OS-level concurrent capture (`concurrentCameraIds` returning a combination of
  2+ rear camera IDs) is only exposed on specific flagship devices with the right
  chipset/HAL support, similar to how only Pro-model iPhones support
  `AVCaptureMultiCamSession` wide+ultra-wide. This is a real, useful result either way.
- The Preview tab should show a live feed with a "Live - Back camera" (or "Front
  camera" if no rear camera exists) status bar at the bottom.

## Local build (if you do install Android Studio later)

Open the `mobile/android/PadelCameraApp/` folder directly in Android Studio — it's a
standard Gradle project, no extra setup needed. Run on a connected phone with **USB
debugging** enabled (Settings → About phone → tap "Build number" 7 times to unlock
Developer Options → enable USB debugging).
