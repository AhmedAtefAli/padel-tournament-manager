package com.padelcameraapp.camera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.params.StreamConfigurationMap
import android.os.Build
import android.util.Range
import androidx.core.content.ContextCompat

/**
 * Android Milestone 2 equivalent: detect what this device's cameras can do. No capture
 * session is opened here - that's `SingleCameraController` (Milestone 3 equivalent).
 */
class CameraCapabilityService(private val context: Context) {

    fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * Queries the device's actual camera hardware - the direct analogue of iOS's
     * `CameraCaptureService.capabilities()`. Enumerating cameras and reading their
     * characteristics does not require the CAMERA permission on Android; only opening
     * a capture session does, so this always returns real data even before permission
     * is granted (permission state is reported separately via `hasCameraPermission`).
     */
    fun capabilities(): CameraCapabilities {
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager

        val allDevices = manager.cameraIdList.mapNotNull { id ->
            runCatching { makeDeviceInfo(manager, id) }.getOrNull()
        }
        val rear = allDevices.filter { it.facing == CameraDeviceInfo.Lens.BACK }
        val front = allDevices.filter { it.facing == CameraDeviceInfo.Lens.FRONT }

        val concurrentRearComboExists = hasConcurrentRearCombo(manager, rear.map { it.id }.toSet())

        val recommended = when {
            concurrentRearComboExists -> RecommendedCaptureConfiguration.CONCURRENT_REAR_CAPTURE
            rear.isNotEmpty() -> RecommendedCaptureConfiguration.SINGLE_REAR_ONLY
            else -> RecommendedCaptureConfiguration.UNSUPPORTED
        }

        return CameraCapabilities(
            concurrentCameraSupported = concurrentRearComboExists,
            rearCameras = rear,
            frontCameras = front,
            recommendedConfiguration = recommended,
            hasCameraPermission = hasCameraPermission()
        )
    }

    /**
     * `CameraManager.concurrentCameraIds` (API 30+) lists which camera ID combinations
     * the device can legally run at the same time - this is Android's real equivalent
     * of `AVCaptureMultiCamSession.isMultiCamSupported`. A combo only counts here if it
     * contains 2+ distinct *rear* camera IDs, since that's what the padel rig needs.
     */
    private fun hasConcurrentRearCombo(manager: CameraManager, rearIds: Set<String>): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false
        return runCatching {
            manager.concurrentCameraIds.any { combo ->
                combo.count { it in rearIds } >= 2
            }
        }.getOrDefault(false)
    }

    private fun makeDeviceInfo(manager: CameraManager, id: String): CameraDeviceInfo {
        val characteristics = manager.getCameraCharacteristics(id)

        val facing = when (characteristics.get(CameraCharacteristics.LENS_FACING)) {
            CameraCharacteristics.LENS_FACING_FRONT -> CameraDeviceInfo.Lens.FRONT
            CameraCharacteristics.LENS_FACING_BACK -> CameraDeviceInfo.Lens.BACK
            CameraCharacteristics.LENS_FACING_EXTERNAL -> CameraDeviceInfo.Lens.EXTERNAL
            else -> CameraDeviceInfo.Lens.UNKNOWN
        }

        val capabilities = characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
        val isLogicalMultiCamera = capabilities?.contains(
            CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_LOGICAL_MULTI_CAMERA
        ) ?: false

        val physicalIds = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            characteristics.physicalCameraIds
        } else {
            emptySet()
        }

        val streams = readStreams(characteristics)

        return CameraDeviceInfo(
            id = id,
            facing = facing,
            isLogicalMultiCamera = isLogicalMultiCamera,
            physicalCameraIds = physicalIds,
            streams = streams
        )
    }

    private fun readStreams(characteristics: CameraCharacteristics): List<CameraStreamInfo> {
        val map: StreamConfigurationMap =
            characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP) ?: return emptyList()

        val fpsRanges: Array<Range<Int>> =
            characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES) ?: emptyArray()
        val maxFps = fpsRanges.maxOfOrNull { it.upper } ?: 30

        // SurfaceTexture is the class CameraX/Camera2 preview output normally targets.
        val sizes = runCatching {
            map.getOutputSizes(android.graphics.SurfaceTexture::class.java)?.toList() ?: emptyList()
        }.getOrDefault(emptyList())

        return sizes
            .sortedByDescending { it.width.toLong() * it.height }
            .take(5)
            .map { CameraStreamInfo(it.width, it.height, maxFps) }
    }
}
