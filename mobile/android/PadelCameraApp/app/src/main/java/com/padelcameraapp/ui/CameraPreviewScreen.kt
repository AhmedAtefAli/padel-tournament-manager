package com.padelcameraapp.ui

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Preview
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.padelcameraapp.camera.CameraCapabilityService
import com.padelcameraapp.camera.SingleCameraController

/**
 * Android Milestone 3's screen: opens one camera and shows its live feed. This screen
 * only ever binds a single [Preview] use case - dual-camera capture is Milestone 4+,
 * mirroring the iOS `SingleCameraPreviewScreen`.
 */
@Composable
fun CameraPreviewScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val service = remember { CameraCapabilityService(context) }
    val controller = remember { SingleCameraController(context) }

    var hasPermission by remember { mutableStateOf(service.hasCameraPermission()) }
    var state by remember { mutableStateOf<SingleCameraController.State>(SingleCameraController.State.Starting) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    LaunchedEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (hasPermission) {
            val previewUseCase = remember { Preview.Builder().build() }

            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    PreviewView(ctx).also { previewView ->
                        previewUseCase.setSurfaceProvider(previewView.surfaceProvider)
                    }
                }
            )

            DisposableEffect(Unit) {
                controller.start(lifecycleOwner, previewUseCase) { newState -> state = newState }
                onDispose { controller.stop() }
            }
        } else {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black))
        }

        StatusBar(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxSize(),
            hasPermission = hasPermission,
            state = state
        )
    }
}

@Composable
private fun StatusBar(
    modifier: Modifier = Modifier,
    hasPermission: Boolean,
    state: SingleCameraController.State
) {
    Box(modifier = modifier, contentAlignment = Alignment.BottomCenter) {
        Surface(color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f)) {
            val text = when {
                !hasPermission -> "Camera permission not granted"
                state is SingleCameraController.State.Failed -> state.message
                state is SingleCameraController.State.Running -> "Live - ${state.lensLabel}"
                else -> "Starting..."
            }
            val isError = !hasPermission || state is SingleCameraController.State.Failed
            Text(
                text = text,
                modifier = Modifier.padding(12.dp),
                color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
