import SwiftUI
import AVFoundation

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
