import SwiftUI

/// Milestone 2 entry point. This app currently does exactly one thing: show the
/// camera-capabilities debug screen. Capture, recording, scoring, and networking are
/// out of scope until later milestones (see docs/padel-camera-architecture.md).
@main
struct PadelCameraAppApp: App {
    var body: some Scene {
        WindowGroup {
            CapabilitiesDebugView()
        }
    }
}
