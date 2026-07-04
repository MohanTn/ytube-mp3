package com.ytube.mp3

import com.ytube.mp3.model.AppSettings
import java.io.File

object Config {
    val rootDir: File = File(System.getProperty("user.dir")).canonicalFile
    val dataDir: File = resolveDir(System.getenv("DATA_DIR"), rootDir.resolve("data"))
    val stateFile: File = dataDir.resolve("state.json")
    val port: Int = System.getenv("PORT")?.toIntOrNull() ?: 3010

    val ytDlpPath: String = resolveBinaryPath(System.getenv("YTDLP_PATH"), "yt-dlp")
    val ffmpegPath: String = resolveBinaryPath(System.getenv("FFMPEG_PATH"), "ffmpeg")

    val defaultSettings = AppSettings(
        outputDir = rootDir.resolve("downloads").absolutePath,
        audioBitrateKbps = 192,
        filenameTemplate = "%(title)s.%(ext)s",
        maxQueueSize = 100,
        cookiesFilePath = "",
        embedThumbnail = true,
        embedMetadata = true,
    )

    val allowedBitrates = listOf(128, 192, 256, 320)
    val allowedTemplatePlaceholders = listOf(
        "%(title)s", "%(id)s", "%(uploader)s", "%(upload_date)s", "%(ext)s",
    )

    private fun resolveDir(envValue: String?, fallback: File): File =
        if (envValue.isNullOrBlank()) fallback else File(envValue).canonicalFile

    private fun resolveBinaryPath(value: String?, fallback: String): String {
        val raw = value ?: fallback
        return if (raw.contains("/") && !File(raw).isAbsolute) {
            rootDir.resolve(raw).absolutePath
        } else {
            raw
        }
    }
}
