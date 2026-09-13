import AVFoundation

/// A single capture format a camera device supports — resolution + max frame rate.
/// Deliberately not hardcoded to 4K/60: §14 of the architecture doc calls out that
/// resolution/FPS ceilings differ per camera pair, so this must always be read from
/// the device, never assumed.
struct CameraFormatInfo: Identifiable, Hashable {
    let id = UUID()
    let width: Int32
    let height: Int32
    let maxFrameRate: Double

    var resolutionLabel: String { "\(width)×\(height)" }
}

/// One physical camera this device exposes, plus what it can actually do.
struct CameraDeviceInfo: Identifiable, Hashable {
    let id: String // AVCaptureDevice.uniqueID
    let label: String // human-readable, e.g. "Back Camera" / "Back Ultra Wide Camera"
    let deviceType: AVCaptureDevice.DeviceType
    let position: AVCaptureDevice.Position
    let formats: [CameraFormatInfo]

    static func == (lhs: CameraDeviceInfo, rhs: CameraDeviceInfo) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

/// The capture configuration `MatchSessionController` should actually use, chosen by
/// the fallback chain from docs/padel-camera-architecture.md §14:
/// wide+ultra-wide → wide only → ultra-wide only → unsupported.
enum RecommendedCaptureConfiguration: String {
    case wideAndUltraWide
    case wideOnly
    case ultraWideOnly
    case unsupported

    var description: String {
        switch self {
        case .wideAndUltraWide: return "Wide + Ultra-wide (dual rear capture)"
        case .wideOnly: return "Wide only (single rear camera)"
        case .ultraWideOnly: return "Ultra-wide only (no wide lens found)"
        case .unsupported: return "No usable rear camera — capture unsupported on this device"
        }
    }
}

/// Everything Milestone 2 needs to answer: "what can this specific physical device do?"
/// This is queried fresh every time a match session starts (§14) — never cached across
/// app launches or assumed from the device model name, since capability depends on the
/// actual silicon/lens combo and can change with iOS versions.
struct CameraCapabilities {
    let isMultiCamSessionSupported: Bool // AVCaptureMultiCamSession.isMultiCamSupported
    let rearCameras: [CameraDeviceInfo]
    let frontCameras: [CameraDeviceInfo]
    let recommendedConfiguration: RecommendedCaptureConfiguration
    let permissionStatus: AVAuthorizationStatus

    var hasWideRear: Bool { rearCameras.contains { $0.deviceType == .builtInWideAngleCamera } }
    var hasUltraWideRear: Bool { rearCameras.contains { $0.deviceType == .builtInUltraWideCamera } }
}
