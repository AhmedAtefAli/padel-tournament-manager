import SwiftUI
import AVFoundation

/// Milestone 2's developer/debug screen: shows exactly what this physical device
/// reports for its cameras. No capture happens here — purely a readout, per the
/// Milestone 2 scope in docs/padel-camera-architecture.md.
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
