import AVFoundation

/// Milestone 3 scope: open a single `AVCaptureSession` using one physical camera and
/// expose it for live preview. No recording, no dual-camera, no frame synchronization —
/// those are later milestones (docs/padel-camera-architecture.md).
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

    /// Starts capture using `device` if given, otherwise the best available rear camera,
    /// falling back to whatever `AVCaptureDevice.default(for: .video)` returns (e.g. the
    /// front camera) so the demo still shows something on unusual hardware rather than
    /// silently failing.
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
