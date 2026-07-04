package com.ytube.mp3.model

import kotlinx.serialization.Serializable

@Serializable
data class QueueItem(
    val id: String,
    val url: String,
    var title: String? = null,
    var status: String = "queued",
    var progress: Double = 0.0,
    var speed: String? = null,
    var eta: String? = null,
    var outputPath: String? = null,
    var error: String? = null,
    val addedAt: String,
    var startedAt: String? = null,
    var finishedAt: String? = null,
)

@Serializable
data class AppSettings(
    val outputDir: String,
    val audioBitrateKbps: Int,
    val filenameTemplate: String,
    val maxQueueSize: Int,
    val cookiesFilePath: String,
    val embedThumbnail: Boolean,
    val embedMetadata: Boolean,
)

@Serializable
data class AppState(
    val version: Int = 1,
    var settings: AppSettings,
    var queue: MutableList<QueueItem> = mutableListOf(),
)

@Serializable
data class SystemStatus(
    var ytDlpAvailable: Boolean = false,
    var ytDlpVersion: String? = null,
    var ffmpegAvailable: Boolean = false,
    var outputDirWritable: Boolean = false,
    var outputDir: String? = null,
)

data class ProgressUpdate(
    val status: String,
    val progress: Double,
    val speed: String?,
    val eta: String?,
)

data class DownloadHandle(
    val deferred: kotlinx.coroutines.Deferred<String?>,
    val cancel: suspend () -> Unit,
)

@Serializable
data class ValidationFieldError(val field: String, val message: String)

@Serializable
data class AddItemsResult(
    val added: List<QueueItem>,
    val rejected: List<RejectedUrl>,
)

@Serializable
data class RejectedUrl(val url: String, val reason: String)

data class UrlValidationResult(
    val valid: Boolean,
    val normalizedUrl: String? = null,
    val reason: String? = null,
)
