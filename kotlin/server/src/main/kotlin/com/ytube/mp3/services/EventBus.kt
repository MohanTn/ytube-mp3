package com.ytube.mp3.services

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.JsonElement

data class BroadcastEvent(val type: String, val data: JsonElement)

object EventBus {
    private val _events = MutableSharedFlow<BroadcastEvent>(
        replay = 0,
        extraBufferCapacity = 256,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<BroadcastEvent> = _events.asSharedFlow()

    fun broadcast(type: String, data: JsonElement) {
        _events.tryEmit(BroadcastEvent(type, data))
    }
}
