package com.ytube.mp3.api

import com.ytube.mp3.AppState
import com.ytube.mp3.model.ItemProgressPayload
import com.ytube.mp3.model.QueueUpdatePayload
import com.ytube.mp3.model.SnapshotPayload
import com.ytube.mp3.model.SystemStatusDto
import io.ktor.client.*
import io.ktor.client.plugins.sse.*
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

// Separate client for SSE — same platform engine selection, SSE plugin only
private val sseClient = HttpClient {
    install(SSE)
}

suspend fun connectSse(state: AppState) {
    while (true) {
        try {
            sseClient.sse("${state.serverUrl}/api/events") {
                state.isConnected = true
                incoming.collect { event ->
                    val data = event.data ?: return@collect
                    when (event.event) {
                        "snapshot" -> {
                            val p = json.decodeFromString<SnapshotPayload>(data)
                            state.queue = p.queue
                            state.settings = p.settings
                            state.systemStatus = p.systemStatus
                        }
                        "queue:update" -> {
                            state.queue = json.decodeFromString<QueueUpdatePayload>(data).queue
                        }
                        "item:progress" -> {
                            val p = json.decodeFromString<ItemProgressPayload>(data)
                            state.applyItemProgress(
                                id = p.id,
                                status = p.status,
                                progress = p.progress.toDoubleOrNull() ?: 0.0,
                                speed = p.speed.takeIf { it.isNotEmpty() },
                                eta = p.eta.takeIf { it.isNotEmpty() },
                            )
                        }
                        "settings:update" -> state.settings = json.decodeFromString(data)
                        "system:status" -> state.systemStatus = json.decodeFromString<SystemStatusDto>(data)
                    }
                }
            }
        } catch (_: Exception) {
            state.isConnected = false
        }
        state.isConnected = false
        delay(3_000)
    }
}
