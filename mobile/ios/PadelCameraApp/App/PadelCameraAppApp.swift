import SwiftUI

/// Entry point covering Milestones 2–3: capability detection and single-camera preview.
/// Recording, dual-camera, scoring, and networking are out of scope until later
/// milestones (see docs/padel-camera-architecture.md).
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
