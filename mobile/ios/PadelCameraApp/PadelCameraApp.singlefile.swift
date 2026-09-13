// Milestones 2–3 — camera capability detection + single-camera live preview, combined
// into ONE file for quick testing in Swift Playgrounds. This is a convenience copy of
// the same code that lives split across Camera/, UI/, and App/ in this folder for the
// real project structure — if you change one, remember to change the other, or just
// treat this file as disposable.
//
// How to use in Swift Playgrounds:
//   1. Swift Playgrounds -> + -> App -> name it PadelCameraApp.
//   2. Delete the template's ContentView.swift.
//   3. Replace the contents of the generated app-entry file (the one with `@main`)
//      with the ENTIRE contents of this file.
//   4. Tap the project name in the file navigator -> App Info / Settings (gear icon)
//      -> Privacy / Capabilities -> enable Camera, with a usage description like
//      "PadelCameraApp needs camera access to test capture on this device."
//   5. Run. This launches on whichever device is running Swift Playgrounds (your iPad,
//      unless you've set up running on a paired iPhone).

import SwiftUI
import AVFoundation

// MARK: - Models (Milestone 2)

/// A single capture format a camera device supports — resolution + max frame rate.
/// Deliberately not hardcoded to 4K/60: resolution/FPS ceilings differ per camera pair,
/// so this must always be read from the device, never assumed.
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

/// The capture configuration the app should actually use, chosen by the fallback chain:
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
/// Queried fresh every time — never cached across app launches or assumed from the
/// device model name, since capability depends on the actual silicon/lens combo.
struct CameraCapabilities {
    let isMultiCamSessionSupported: Bool // AVCaptureMultiCamSession.isMultiCamSupported
    let rearCameras: [CameraDeviceInfo]
    let frontCameras: [CameraDeviceInfo]
    let recommendedConfiguration: RecommendedCaptureConfiguration
    let permissionStatus: AVAuthorizationStatus

    var hasWideRear: Bool { rearCameras.contains { $0.deviceType == .builtInWideAngleCamera } }
    var hasUltraWideRear: Bool { rearCameras.contains { $0.deviceType == .builtInUltraWideCamera } }
}

// MARK: - Capability service (Milestone 2)

/// Milestone 2 scope: detect what this device's cameras can do. No capture session is
/// opened here — that's `SingleCameraCaptureController` below (Milestone 3).
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

    /// Queries the device's actual camera hardware — run before any capture attempt,
    /// instead of hardcoding behavior per iPhone/iPad model.
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

// MARK: - Single-camera capture (Milestone 3)

/// Milestone 3 scope: open a single `AVCaptureSession` using one physical camera and
/// expose it for live preview. No recording, no dual-camera, no frame synchronization —
/// those are later milestones.
final class SingleCameraCaptureController: NSObject, ObservableObject {
    enum CaptureError: Error, LocalizedError {
        case noCameraAvailable
        case cannotAddInput
        case configurationFailed(Error)

        var errorDescription: String? {
            switch self {
            case .noCameraAvailable:
                return "No usable camera found on this device."
            case .cannotAddInput:
                return "Could not add the camera as a capture input."
            case .configurationFailed(let error):
                return "Capture session configuration failed: \(error.localizedDescription)"
            }
        }
    }

    let session = AVCaptureSession()

    @Published private(set) var isRunning = false
    @Published private(set) var activeDeviceLabel: String?
    @Published private(set) var lastError: CaptureError?

    private let sessionQueue = DispatchQueue(label: "PadelCameraApp.SingleCameraCaptureController")

    func start(preferring device: AVCaptureDevice? = nil) {
        sessionQueue.async { [weak self] in
            self?.configureAndStart(preferring: device)
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            if self.session.isRunning {
                self.session.stopRunning()
            }
            DispatchQueue.main.async { self.isRunning = false }
        }
    }

    private func configureAndStart(preferring preferredDevice: AVCaptureDevice?) {
        session.beginConfiguration()
        defer { session.commitConfiguration() }

        session.inputs.forEach { session.removeInput($0) }

        guard let device = preferredDevice ?? defaultRearCamera() ?? AVCaptureDevice.default(for: .video) else {
            publish(error: .noCameraAvailable)
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: device)
            guard session.canAddInput(input) else {
                publish(error: .cannotAddInput)
                return
            }
            session.addInput(input)
            session.sessionPreset = .high
            session.startRunning()

            DispatchQueue.main.async {
                self.isRunning = self.session.isRunning
                self.activeDeviceLabel = device.localizedName
                self.lastError = nil
            }
        } catch {
            publish(error: .configurationFailed(error))
        }
    }

    private func defaultRearCamera() -> AVCaptureDevice? {
        AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInUltraWideCamera],
            mediaType: .video,
            position: .back
        ).devices.first
    }

    private func publish(error: CaptureError) {
        DispatchQueue.main.async {
            self.lastError = error
            self.isRunning = false
        }
    }
}

// MARK: - UI: capabilities screen (Milestone 2)

/// Milestone 2's developer/debug screen: shows exactly what this physical device
/// reports for its cameras. No capture happens here — purely a readout.
struct CapabilitiesDebugView: View {
    @State private var capabilities: CameraCapabilities?
    @State private var isRefreshing = false

    private let service = CameraCaptureService()

    var body: some View {
        NavigationStack {
            List {
                if let capabilities {
                    Section("Recommendation") {
                        Label(
                            capabilities.recommendedConfiguration.description,
                            systemImage: iconName(for: capabilities.recommendedConfiguration)
                        )
                        .font(.headline)
                    }

                    Section("Multi-cam") {
                        LabeledContent(
                            "AVCaptureMultiCamSession.isMultiCamSupported",
                            value: capabilities.isMultiCamSessionSupported ? "Yes" : "No"
                        )
                        LabeledContent("Camera permission", value: permissionLabel(capabilities.permissionStatus))
                    }

                    Section("Rear cameras (\(capabilities.rearCameras.count))") {
                        if capabilities.rearCameras.isEmpty {
                            Text("None found").foregroundStyle(.secondary)
                        }
                        ForEach(capabilities.rearCameras) { deviceRow($0) }
                    }

                    Section("Front cameras (\(capabilities.frontCameras.count))") {
                        if capabilities.frontCameras.isEmpty {
                            Text("None found").foregroundStyle(.secondary)
                        }
                        ForEach(capabilities.frontCameras) { deviceRow($0) }
                    }
                } else {
                    Text("Tap Refresh to query this device's cameras.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Camera Capabilities")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task { await refresh() }
                    } label: {
                        if isRefreshing {
                            ProgressView()
                        } else {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                    }
                }
            }
            .task { await refresh() }
        }
    }

    private func refresh() async {
        isRefreshing = true
        _ = await service.requestPermissionIfNeeded()
        capabilities = service.capabilities()
        isRefreshing = false
    }

    @ViewBuilder
    private func deviceRow(_ device: CameraDeviceInfo) -> some View {
        DisclosureGroup(device.label) {
            Text("Type: \(deviceTypeLabel(device.deviceType))")
                .font(.caption)
            let bestFormats = device.formats
                .sorted { $0.width * $0.height > $1.width * $1.height }
                .prefix(5)
            ForEach(Array(bestFormats)) { format in
                Text("\(format.resolutionLabel) up to \(Int(format.maxFrameRate)) fps")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func iconName(for config: RecommendedCaptureConfiguration) -> String {
        switch config {
        case .wideAndUltraWide: return "checkmark.circle.fill"
        case .wideOnly, .ultraWideOnly: return "exclamationmark.triangle.fill"
        case .unsupported: return "xmark.octagon.fill"
        }
    }

    private func deviceTypeLabel(_ type: AVCaptureDevice.DeviceType) -> String {
        switch type {
        case .builtInWideAngleCamera: return "Wide"
        case .builtInUltraWideCamera: return "Ultra-wide"
        case .builtInTelephotoCamera: return "Telephoto"
        default: return type.rawValue
        }
    }

    private func permissionLabel(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "Authorized"
        case .denied: return "Denied"
        case .restricted: return "Restricted"
        case .notDetermined: return "Not determined"
        @unknown default: return "Unknown"
        }
    }
}

// MARK: - UI: live preview screen (Milestone 3)

/// UIKit bridge: hosts an `AVCaptureVideoPreviewLayer` bound to a capture session, since
/// SwiftUI has no native live-camera-preview view.
struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewUIView {
        let view = PreviewUIView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewUIView, context: Context) {}

    final class PreviewUIView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var videoPreviewLayer: AVCaptureVideoPreviewLayer {
            layer as! AVCaptureVideoPreviewLayer
        }
    }
}

/// Milestone 3's screen: opens one camera and shows its live feed. This screen only
/// ever runs a single `AVCaptureSession` — dual-camera capture is Milestone 4+.
struct SingleCameraPreviewScreen: View {
    @StateObject private var controller = SingleCameraCaptureController()
    @State private var permissionStatus: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        NavigationStack {
            ZStack {
                if permissionStatus == .authorized {
                    CameraPreviewView(session: controller.session)
                        .ignoresSafeArea()
                } else {
                    Color.black.ignoresSafeArea()
                }

                VStack {
                    Spacer()
                    statusBar
                }
            }
            .navigationTitle("Single-Camera Preview")
            .navigationBarTitleDisplayMode(.inline)
            .task { await requestPermissionAndStart() }
            .onDisappear { controller.stop() }
        }
    }

    private var statusBar: some View {
        Group {
            if permissionStatus != .authorized {
                Label("Camera permission not granted (\(permissionLabel))", systemImage: "lock.fill")
                    .foregroundStyle(.red)
            } else if let error = controller.lastError {
                Label(error.localizedDescription, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
            } else if controller.isRunning {
                Label("Live · \(controller.activeDeviceLabel ?? "unknown camera")", systemImage: "video.fill")
                    .foregroundStyle(.green)
            } else {
                Label("Starting…", systemImage: "hourglass")
                    .foregroundStyle(.secondary)
            }
        }
        .font(.caption)
        .padding()
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
    }

    private var permissionLabel: String {
        switch permissionStatus {
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not determined"
        case .authorized: return "authorized"
        @unknown default: return "unknown"
        }
    }

    private func requestPermissionAndStart() async {
        let service = CameraCaptureService()
        permissionStatus = await service.requestPermissionIfNeeded()
        guard permissionStatus == .authorized else { return }
        controller.start()
    }
}

// MARK: - App entry

/// Entry point covering Milestones 2–3: capability detection and single-camera preview.
@main
struct PadelCameraAppApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                CapabilitiesDebugView()
                    .tabItem { Label("Capabilities", systemImage: "list.bullet.clipboard") }
                SingleCameraPreviewScreen()
                    .tabItem { Label("Preview", systemImage: "camera.fill") }
            }
        }
    }
}
