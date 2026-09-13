package com.padelcameraapp.camera

/**
 * A single stream size this camera supports, roughly the Android equivalent of iOS's
 * CameraFormatInfo. Frame-rate ranges come from the same characteristics query.
 */
data class CameraStreamInfo(
    val width: Int,
    val height: Int,
    val maxFrameRate: Int
) {
    val resolutionLabel: String get() = "${width}x${height}"
}

/** One physical camera this device exposes, plus what it can do. */
data class CameraDeviceInfo(
    val id: String,
    val facing: Lens,
    val isLogicalMultiCamera: Boolean, // OS-fused camera combining multiple physical lenses
    val physicalCameraIds: Set<String>,
    val streams: List<CameraStreamInfo>
) {
    enum class Lens { FRONT, BACK, EXTERNAL, UNKNOWN }
}

/**
 * The capture configuration this app should actually use, mirroring the fallback chain
 * from the iOS side (docs/padel-camera-architecture.md SS14): true concurrent rear
 * capture -> single rear camera -> unsupported. Android has no direct equivalent of
 * "wide + ultra-wide" as a named API concept - what it exposes instead is
 * `CameraManager.concurrentCameraIds`, which lists which camera ID *combinations* can
 * legally run at the same time. Whether a given combination is wide+ultra-wide
 * specifically depends on which physical lenses those IDs represent on this device.
 */
enum class RecommendedCaptureConfiguration(val description: String) {
    CONCURRENT_REAR_CAPTURE("Concurrent rear capture (2+ rear cameras running simultaneously)"),
    SINGLE_REAR_ONLY("Single rear camera only"),
    UNSUPPORTED("No usable rear camera - capture unsupported on this device")
}

/**
 * Everything the Android Milestone 2 equivalent needs to answer: "what can this
 * specific physical device do?" Queried fresh every time, never cached or assumed from
 * the device model name - mirrors the same principle as the iOS `CameraCapabilities`.
 */
data class CameraCapabilities(
    val concurrentCameraSupported: Boolean, // true if any all-rear combo exists in concurrentCameraIds
    val rearCameras: List<CameraDeviceInfo>,
    val frontCameras: List<CameraDeviceInfo>,
    val recommendedConfiguration: RecommendedCaptureConfiguration,
    val hasCameraPermission: Boolean
)
