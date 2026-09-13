import AVFoundation

/// Milestone 2 scope only (docs/padel-camera-architecture.md, Milestone 2 + §14):
/// detect what this device's cameras can do. No capture session is opened, nothing is
/// recorded — that starts at Milestone 3.
final class CameraCaptureService {

    /// Requests camera permission if it hasn't been decided yet. `capabilities()` below
    /// still works even without permission (device *existence* can be enumerated either
    /// way), but call this first if you want an accurate `permissionStatus` for the UI.
    func requestPermissionIfNeeded() async -> AVAuthorizationStatus {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard status == .notDetermined else { return status }
        let granted = await AVCaptureDevice.requestAccess(for: .video)
        return granted ? .authorized : .denied
    }

    /// Queries the device's actual camera hardware — the "first-class, always-queried
    /// step" §14 calls for, run before any capture attempt, instead of hardcoding
    /// behavior per iPhone/iPad model.
    func capabilities() -> CameraCapabilities {
        let permissionStatus = AVCaptureDevice.authorizationStatus(for: .video)

        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInUltraWideCamera, .builtInTelephotoCamera],
            mediaType: .video,
            position: .unspecified
        )

        let allDevices = discovery.devices.map(makeDeviceInfo)
        let rear = allDevices.filter { $0.position == .back }
        let front = allDevices.filter { $0.position == .front }

        let hasWide = rear.contains { $0.deviceType == .builtInWideAngleCamera }
        let hasUltraWide = rear.contains { $0.deviceType == .builtInUltraWideCamera }
        let multiCamSupported = AVCaptureMultiCamSession.isMultiCamSupported

        let recommended: RecommendedCaptureConfiguration
        switch (hasWide, hasUltraWide, multiCamSupported) {
        case (true, true, true):
            recommended = .wideAndUltraWide // real dual rear capture is possible
        case (true, _, _):
            recommended = .wideOnly // wide exists but no ultra-wide, or no multicam hardware
        case (false, true, _):
            recommended = .ultraWideOnly // unusual, but handle it rather than crash
        default:
            recommended = .unsupported
        }

        return CameraCapabilities(
            isMultiCamSessionSupported: multiCamSupported,
            rearCameras: rear,
            frontCameras: front,
            recommendedConfiguration: recommended,
            permissionStatus: permissionStatus
        )
    }

    private func makeDeviceInfo(_ device: AVCaptureDevice) -> CameraDeviceInfo {
        let formats = device.formats.map { format -> CameraFormatInfo in
            let dims = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            let maxFPS = format.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 0
            return CameraFormatInfo(width: dims.width, height: dims.height, maxFrameRate: maxFPS)
        }
        return CameraDeviceInfo(
            id: device.uniqueID,
            label: device.localizedName,
            deviceType: device.deviceType,
            position: device.position,
            formats: formats
        )
    }
}
