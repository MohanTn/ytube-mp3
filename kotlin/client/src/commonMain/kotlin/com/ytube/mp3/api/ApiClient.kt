package com.ytube.mp3.api

import com.ytube.mp3.model.AppSettingsDto
import com.ytube.mp3.model.QueueItemDto
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.putJsonArray

// No engine specified — Ktor uses the platform engine on the classpath (Js for wasmJs, Darwin for iOS)
val httpClient = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
}

suspend fun addUrls(baseUrl: String, urls: List<String>): Result<Unit> = runCatching {
    httpClient.post("$baseUrl/api/queue") {
        contentType(ContentType.Application.Json)
        setBody(buildJsonObject { putJsonArray("urls") { urls.forEach { add(JsonPrimitive(it)) } } })
    }
}

suspend fun removeItem(baseUrl: String, id: String): Result<Unit> = runCatching {
    httpClient.delete("$baseUrl/api/queue/$id")
}

suspend fun retryItem(baseUrl: String, id: String): Result<QueueItemDto> = runCatching {
    httpClient.post("$baseUrl/api/queue/$id/retry").body()
}

suspend fun updateSettings(baseUrl: String, settings: AppSettingsDto): Result<AppSettingsDto> = runCatching {
    httpClient.put("$baseUrl/api/settings") {
        contentType(ContentType.Application.Json)
        setBody(settings)
    }.body()
}
