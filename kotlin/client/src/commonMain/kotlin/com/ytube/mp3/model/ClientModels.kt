package com.ytube.mp3.model

import kotlinx.serialization.Serializable

@Serializable
data class QueueItemDto(
    val id: String,
    val url: String,
    val title: String? = null,
    val status: String = "queued",
    val progress: Double = 0.0,
    val speed: String? = null,
    val eta: String? = null,
    val outputPath: String? = null,
    val error: String? = null,
    val addedAt: String,
    val startedAt: String? = null,
    val finishedAt: String? = null,
)

@Serializable
data class AppSettingsDto(
    val outputDir: String,
    val audioBitrateKbps: Int,
    val filenameTemplate: String,
    val maxQueueSize: Int,
    val cookiesFilePath: String,
    val embedThumbnail: Boolean,
    val embedMetadata: Boolean,
)

@Serializable
data class SystemStatusDto(
    val ytDlpAvailable: Boolean = false,
    val ytDlpVersion: String? = null,
    val ffmpegAvailable: Boolean = false,
    val outputDirWritable: Boolean = false,
    val outputDir: String? = null,
)

@Serializable
data class SnapshotPayload(
    val queue: List<QueueItemDto>,
    val settings: AppSettingsDto,
    val systemStatus: SystemStatusDto,
)

@Serializable
data class QueueUpdatePayload(val queue: List<QueueItemDto>)

@Serializable
data class ItemProgressPayload(
    val id: String,
    val status: String,
    val progress: String,
    val speed: String,
    val eta: String,
)
