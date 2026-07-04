package com.ytube.mp3.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ytube.mp3.LocalAppState
import com.ytube.mp3.api.updateSettings
import com.ytube.mp3.model.AppSettingsDto
import kotlinx.coroutines.launch

@Composable
fun SettingsForm() {
    val state = LocalAppState.current
    val current = state.settings ?: return
    val scope = rememberCoroutineScope()

    var serverUrl by remember(state.serverUrl) { mutableStateOf(state.serverUrl) }
    var outputDir by remember(current.outputDir) { mutableStateOf(current.outputDir) }
    var bitrate by remember(current.audioBitrateKbps) { mutableStateOf(current.audioBitrateKbps.toString()) }
    var template by remember(current.filenameTemplate) { mutableStateOf(current.filenameTemplate) }
    var maxQueue by remember(current.maxQueueSize) { mutableStateOf(current.maxQueueSize.toString()) }
    var cookies by remember(current.cookiesFilePath) { mutableStateOf(current.cookiesFilePath) }
    var embedThumb by remember(current.embedThumbnail) { mutableStateOf(current.embedThumbnail) }
    var embedMeta by remember(current.embedMetadata) { mutableStateOf(current.embedMetadata) }
    var saving by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        Text("Settings", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(12.dp))

        SettingField("Server URL", serverUrl) { serverUrl = it }
        SettingField("Output directory", outputDir) { outputDir = it }
        SettingField("Audio bitrate (kbps)", bitrate) { bitrate = it }
        SettingField("Filename template", template) { template = it }
        SettingField("Max queue size", maxQueue) { maxQueue = it }
        SettingField("Cookies file path", cookies) { cookies = it }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = embedThumb, onCheckedChange = { embedThumb = it })
            Text("Embed thumbnail", modifier = Modifier.padding(start = 4.dp))
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = embedMeta, onCheckedChange = { embedMeta = it })
            Text("Embed metadata", modifier = Modifier.padding(start = 4.dp))
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    saving = true
                    // Update server URL immediately (in-memory only — no server round-trip needed)
                    state.serverUrl = serverUrl
                    val dto = AppSettingsDto(
                        outputDir = outputDir,
                        audioBitrateKbps = bitrate.toIntOrNull() ?: current.audioBitrateKbps,
                        filenameTemplate = template,
                        maxQueueSize = maxQueue.toIntOrNull() ?: current.maxQueueSize,
                        cookiesFilePath = cookies,
                        embedThumbnail = embedThumb,
                        embedMetadata = embedMeta,
                    )
                    updateSettings(state.serverUrl, dto)
                        .onSuccess { state.settings = it }
                        .onFailure { state.toastMessage = "Failed to save settings: ${it.message}" }
                    saving = false
                }
            },
            enabled = !saving,
        ) { Text(if (saving) "Saving…" else "Save") }
    }
}

@Composable
private fun SettingField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        singleLine = true,
    )
}
