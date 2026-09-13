package com.padelcameraapp.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.common.util.concurrent.ListenableFuture

/**
 * Android Milestone 3 equivalent: open a single camera via CameraX and expose it for
 * live preview. No recording, no dual-camera, no frame synchronization - those are
 * later milestones, mirroring the iOS `SingleCameraCaptureController`.
 */
class SingleCameraController(private val context: Context) {

    sealed class State {
        object Starting : State()
        data class Running(val lensLabel: String) : State()
        data class Failed(val message: String) : State()
    }

    private var providerFuture: ListenableFuture<ProcessCameraProvider>? = null

    /**
     * Binds a [Preview] use case to the given lifecycle, preferring the back camera and
     * falling back to the front camera if no rear camera exists, so the demo still
     * shows something on unusual hardware rather than silently failing.
     */
    fun start(
        lifecycleOwner: LifecycleOwner,
        preview: Preview,
        onState: (State) -> Unit
    ) {
        val future = ProcessCameraProvider.getInstance(context)
        providerFuture = future
        future.addListener({
            try {
                val provider = future.get()
                provider.unbindAll()

                val selector = when {
                    provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA) -> CameraSelector.DEFAULT_BACK_CAMERA
                    provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) -> CameraSelector.DEFAULT_FRONT_CAMERA
                    else -> {
                        onState(State.Failed("No usable camera found on this device."))
                        return@addListener
                    }
                }

                provider.bindToLifecycle(lifecycleOwner, selector, preview)
                val label = if (selector == CameraSelector.DEFAULT_BACK_CAMERA) "Back camera" else "Front camera"
                onState(State.Running(label))
            } catch (error: Exception) {
                onState(State.Failed(error.message ?: "Capture session configuration failed."))
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun stop() {
        providerFuture?.let { future ->
            runCatching { future.get().unbindAll() }
        }
    }
}
