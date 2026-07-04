package com.ytube.mp3.services

import com.ytube.mp3.Config
import com.ytube.mp3.model.SystemStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File

val systemStatus = SystemStatus()

suspend fun runStartupChecks() = coroutineScope {
    val settings = StateStore.getSettings()

    val ytDlpCheck = async { execVersionCheck(Config.ytDlpPath, "--version") }
    val ffmpegCheck = async { execVersionCheck(Config.ffmpegPath, "-version") }

    val (ytAvail, ytVer) = ytDlpCheck.await()
    val (ffAvail, _) = ffmpegCheck.await()

    systemStatus.ytDlpAvailable = ytAvail
    systemStatus.ytDlpVersion = ytVer
    systemStatus.ffmpegAvailable = ffAvail
    systemStatus.outputDir = settings.outputDir
    systemStatus.outputDirWritable = checkOutputDirWritable(settings.outputDir)

    if (!systemStatus.ytDlpAvailable) {
        System.err.println(
            "[StartupChecks] yt-dlp binary not found (\"${Config.ytDlpPath}\"). " +
            "Install it: https://github.com/yt-dlp/yt-dlp#installation"
        )
        EventBus.broadcast(
            "system:error",
            buildJsonObject {
                put("code", "YTDLP_NOT_FOUND")
                put("message", "yt-dlp binary not found (\"${Config.ytDlpPath}\"). Install yt-dlp and restart.")
            }
        )
    }

    if (!systemStatus.ffmpegAvailable) {
        System.err.println("[StartupChecks] ffmpeg binary not found (\"${Config.ffmpegPath}\").")
        EventBus.broadcast(
            "system:error",
            buildJsonObject {
                put("code", "FFMPEG_NOT_FOUND")
                put("message", "ffmpeg binary not found (\"${Config.ffmpegPath}\"). Install ffmpeg and restart.")
            }
        )
    }

    if (!systemStatus.outputDirWritable) {
        System.err.println("[StartupChecks] Output directory \"${settings.outputDir}\" is not writable.")
        EventBus.broadcast(
            "system:error",
            buildJsonObject {
                put("code", "OUTPUT_DIR_NOT_WRITABLE")
                put("message", "Output directory \"${settings.outputDir}\" is not writable.")
            }
        )
    }
}

fun refreshOutputDirStatus(outputDir: String) {
    systemStatus.outputDir = outputDir
    systemStatus.outputDirWritable = checkOutputDirWritable(outputDir)
}

private suspend fun execVersionCheck(bin: String, vararg args: String): Pair<Boolean, String?> =
    withContext(Dispatchers.IO) {
        try {
            val process = ProcessBuilder(bin, *args)
                .redirectErrorStream(true)
                .start()
            val out = process.inputStream.bufferedReader().readText().trim()
            val exited = process.waitFor()
            if (exited == 0) Pair(true, out.lines().firstOrNull()) else Pair(false, null)
        } catch (_: Exception) {
            Pair(false, null)
        }
    }

private fun checkOutputDirWritable(outputDir: String): Boolean = try {
    val dir = File(outputDir)
    dir.mkdirs()
    dir.canWrite()
} catch (_: Exception) {
    false
}
