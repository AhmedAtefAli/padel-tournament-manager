package com.padelcameraapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.padelcameraapp.camera.CameraCapabilities
import com.padelcameraapp.camera.CameraCapabilityService
import com.padelcameraapp.camera.CameraDeviceInfo
import com.padelcameraapp.camera.RecommendedCaptureConfiguration

/**
 * Android Milestone 2's developer/debug screen: shows exactly what this physical
 * device reports for its cameras. No capture happens here - purely a readout, mirroring
 * the iOS `CapabilitiesDebugView`.
 */
@Composable
fun CapabilitiesScreen() {
    val context = LocalContext.current
    val service = remember { CameraCapabilityService(context) }
    var capabilities by remember { mutableStateOf<CameraCapabilities?>(null) }
    var refreshTrigger by remember { mutableStateOf(0) }

    LaunchedEffect(refreshTrigger) {
        capabilities = service.capabilities()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Camera Capabilities") },
                actions = {
                    IconButton(onClick = { refreshTrigger++ }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        val caps = capabilities
        if (caps == null) {
            Text(
                "Loading...",
                modifier = Modifier.padding(padding).padding(16.dp)
            )
            return@Scaffold
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            item { RecommendationRow(caps.recommendedConfiguration) }
            item { Divider(modifier = Modifier.padding(vertical = 12.dp)) }

            item {
                Text("Concurrent camera support (API 30+)", style = MaterialTheme.typography.labelLarge)
                Text(if (caps.concurrentCameraSupported) "Yes" else "No")
                Text("Camera permission: ${if (caps.hasCameraPermission) "Granted" else "Not granted"}")
                Text("(This screen doesn't need permission to enumerate cameras; Preview does.)",
                    style = MaterialTheme.typography.bodySmall)
            }
            item { Divider(modifier = Modifier.padding(vertical = 12.dp)) }

            item { Text("Rear cameras (${caps.rearCameras.size})", style = MaterialTheme.typography.titleMedium) }
            items(caps.rearCameras) { DeviceRow(it) }

            item { Divider(modifier = Modifier.padding(vertical = 12.dp)) }
            item { Text("Front cameras (${caps.frontCameras.size})", style = MaterialTheme.typography.titleMedium) }
            items(caps.frontCameras) { DeviceRow(it) }
        }
    }
}

@Composable
private fun RecommendationRow(config: RecommendedCaptureConfiguration) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("Recommendation", style = MaterialTheme.typography.labelLarge)
        val icon = if (config == RecommendedCaptureConfiguration.CONCURRENT_REAR_CAPTURE) {
            Icons.Default.CheckCircle
        } else {
            Icons.Default.Warning
        }
        Icon(icon, contentDescription = null)
        Text(config.description, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun DeviceRow(device: CameraDeviceInfo) {
    Column(modifier = Modifier.padding(vertical = 6.dp)) {
        Text("Camera ${device.id} - ${device.facing}", style = MaterialTheme.typography.bodyLarge)
        if (device.isLogicalMultiCamera) {
            Text(
                "Logical multi-camera fusing physical IDs: ${device.physicalCameraIds.joinToString()}",
                style = MaterialTheme.typography.bodySmall
            )
        }
        device.streams.forEach { stream ->
            Text(
                "${stream.resolutionLabel} up to ${stream.maxFrameRate} fps",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
