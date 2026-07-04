package com.ytube.mp3.routes

import com.ytube.mp3.services.EventBus
import com.ytube.mp3.services.QueueManager
import com.ytube.mp3.services.getSettings
import com.ytube.mp3.services.systemStatus
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.ktor.sse.*
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.put

fun Route.eventsRoutes() {
    sse("/api/events") {
        // Send full state snapshot on connect so the client can hydrate immediately
        val snapshot = buildJsonObject {
            put("queue", Json.encodeToJsonElement(QueueManager.getQueue()))
            put("settings", Json.encodeToJsonElement(getSettings()))
            put("systemStatus", Json.encodeToJsonElement(systemStatus))
        }
        send(ServerSentEvent(data = snapshot.toString(), event = "snapshot"))

        // Merge keep-alive pings and broadcast events from a single coroutine
        coroutineScope {
            val pingJob = launch {
                while (true) {
                    delay(25_000)
                    send(ServerSentEvent(comments = "keep-alive"))
                }
            }
            EventBus.events.collect { event ->
                send(ServerSentEvent(data = event.data.toString(), event = event.type))
            }
            pingJob.cancel()
        }
    }
}
