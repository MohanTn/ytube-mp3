package com.ytube.mp3

import androidx.compose.runtime.*
import com.ytube.mp3.model.AppSettingsDto
import com.ytube.mp3.model.QueueItemDto
import com.ytube.mp3.model.SystemStatusDto

class AppState {
    var queue by mutableStateOf(emptyList<QueueItemDto>())
    var settings by mutableStateOf<AppSettingsDto?>(null)
    var systemStatus by mutableStateOf<SystemStatusDto?>(null)
    var toastMessage by mutableStateOf<String?>(null)
    var showSettings by mutableStateOf(false)
    var isConnected by mutableStateOf(false)
    var serverUrl by mutableStateOf(defaultServerUrl)

    fun applyItemProgress(id: String, status: String, progress: Double, speed: String?, eta: String?) {
        queue = queue.map { item ->
            if (item.id == id) item.copy(status = status, progress = progress, speed = speed, eta = eta)
            else item
        }
    }
}

val LocalAppState = staticCompositionLocalOf<AppState> { error("No AppState provided") }
