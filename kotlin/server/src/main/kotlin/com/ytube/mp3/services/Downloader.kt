package com.ytube.mp3.services

import com.ytube.mp3.Config
import com.ytube.mp3.DownloadCanceledException
import com.ytube.mp3.model.AppSettings
import com.ytube.mp3.model.DownloadHandle
import com.ytube.mp3.model.ProgressUpdate
import com.ytube.mp3.model.QueueItem
import kotlinx.coroutines.*
import java.io.File

private val PROGRESS_RE = Regex(
    """\[download]\s+(\d{1,3}(?:\.\d+)?)%(?:\s+of\s+~?\s*[\d.]+\w+)?(?:\s+at\s+([\d.]+\w+/s|Unknown speed))?(?:\s+ETA\s+([\d:]+|Unknown))?"""
)
private val POSTPROCESS_RE = Regex("""^\[(ExtractAudio|Merger|ffmpeg|Metadata|EmbedThumbnail)]""")
private val DESTINATION_RE = Regex("""^\[ExtractAudio] Destination:\s+(.+)$""")

suspend fun fetchTitle(url: String): String? = withContext(Dispatchers.IO) {
    try {
        val process = ProcessBuilder(
            Config.ytDlpPath, "--dump-single-json", "--no-playlist",
            "--no-warnings", "--skip-download", url,
        ).redirectErrorStream(true).start()
        val output = process.inputStream.bufferedReader().readText()
        process.waitFor()
        val titleMatch = Regex(""""title"\s*:\s*"([^"]+)"""").find(output)
        titleMatch?.groupValues?.get(1)
    } catch (_: Exception) {
        null
    }
}

fun startDownload(
    item: QueueItem,
    settings: AppSettings,
    onProgress: (ProgressUpdate) -> Unit,
    scope: CoroutineScope,
): DownloadHandle {
    val outputTemplate = "${settings.outputDir}/${settings.filenameTemplate}"
    val cmd = buildCommand(item.url, settings, outputTemplate)

    val process = ProcessBuilder(cmd)
        .redirectErrorStream(false)
        .start()

    val stderrBuffer = StringBuilder()
    var outputPath: String? = null
    var canceled = false

    val deferred = scope.async(Dispatchers.IO) {
        val stderrJob = launch {
            process.errorStream.bufferedReader().forEachLine { stderrBuffer.append(it).append('\n') }
        }

        process.inputStream.bufferedReader().forEachLine { line ->
            DESTINATION_RE.find(line)?.let { outputPath = it.groupValues[1].trim() }

            if (POSTPROCESS_RE.containsMatchIn(line)) {
                onProgress(ProgressUpdate("converting", 100.0, null, null))
                return@forEachLine
            }

            PROGRESS_RE.find(line)?.let { m ->
                onProgress(
                    ProgressUpdate(
                        status = "downloading",
                        progress = m.groupValues[1].toDoubleOrNull() ?: 0.0,
                        speed = m.groupValues[2].takeIf { it.isNotEmpty() },
                        eta = m.groupValues[3].takeIf { it.isNotEmpty() },
                    )
                )
            }
        }

        stderrJob.join()
        val exit = process.waitFor()
        if (exit != 0) {
            if (canceled) throw DownloadCanceledException()
            throw RuntimeException(mapErrorMessage(stderrBuffer.toString()))
        }
        outputPath
    }

    val cancel: suspend () -> Unit = {
        canceled = true
        process.destroy()
        cleanupPartialFiles(settings.outputDir)
    }

    return DownloadHandle(deferred, cancel)
}

suspend fun cleanupPartialFiles(outputDir: String) = withContext(Dispatchers.IO) {
    try {
        File(outputDir).listFiles()
            ?.filter { it.name.matches(Regex(""".*\.(part|ytdl)$""", RegexOption.IGNORE_CASE)) ||
                        it.name.matches(Regex(""".*\.temp\.\w+$""")) }
            ?.forEach { it.delete() }
    } catch (_: Exception) {}
}

private fun buildCommand(url: String, settings: AppSettings, outputTemplate: String): List<String> {
    return buildList {
        add(Config.ytDlpPath)
        add("--extract-audio")
        add("--audio-format"); add("mp3")
        add("--audio-quality"); add("${settings.audioBitrateKbps}K")
        add("--output"); add(outputTemplate)
        add("--newline")
        add("--no-playlist")
        add("--no-warnings")
        add("--trim-filenames"); add("200")
        if (Config.ffmpegPath != "ffmpeg") { add("--ffmpeg-location"); add(Config.ffmpegPath) }
        if (settings.cookiesFilePath.isNotBlank()) { add("--cookies"); add(settings.cookiesFilePath) }
        if (settings.embedThumbnail) add("--embed-thumbnail")
        if (settings.embedMetadata) add("--embed-metadata")
        add(url)
    }
}

private fun mapErrorMessage(stderr: String): String {
    val text = stderr.trim()
    return when {
        text.contains("Private video", ignoreCase = true) -> "This video is private"
        text.contains("Video unavailable", ignoreCase = true) -> "Video is unavailable"
        text.contains(Regex("age[- ]restrict|Sign in to confirm your age", RegexOption.IGNORE_CASE)) ->
            "Video is age-restricted (configure a cookies file in Settings)"
        text.contains(Regex("not available in your country|geo.?restrict", RegexOption.IGNORE_CASE)) ->
            "Video is not available in this region"
        text.contains("No space left on device", ignoreCase = true) -> "Disk is full (no space left on device)"
        text.contains(Regex("ffmpeg not found|ffprobe not found", RegexOption.IGNORE_CASE)) -> "ffmpeg binary not found"
        else -> text.lines().filter { it.isNotBlank() }.takeLast(3).joinToString(" ")
            .ifBlank { "yt-dlp exited with an error" }
    }
}
