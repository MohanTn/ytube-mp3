package com.ytube.mp3.utils

import com.ytube.mp3.model.UrlValidationResult
import java.net.URI

private val youtubeHostPattern = Regex(
    """^(www\.|m\.|music\.)?youtube\.com$|^youtu\.be$""",
    RegexOption.IGNORE_CASE,
)

fun validateYoutubeUrl(rawUrl: String): UrlValidationResult {
    if (rawUrl.isBlank()) return UrlValidationResult(valid = false, reason = "URL is empty")

    val trimmed = rawUrl.trim()
    val uri = try {
        URI(trimmed).also { it.toURL() }
    } catch (_: Exception) {
        return UrlValidationResult(valid = false, reason = "Not a valid URL")
    }

    if (uri.scheme != "http" && uri.scheme != "https") {
        return UrlValidationResult(valid = false, reason = "URL must use http or https")
    }

    val host = uri.host ?: return UrlValidationResult(valid = false, reason = "Not a recognized YouTube URL")
    if (!youtubeHostPattern.containsMatchIn(host)) {
        return UrlValidationResult(valid = false, reason = "Not a recognized YouTube URL")
    }

    val isYoutuBe = host.lowercase().endsWith("youtu.be")
    val path = uri.path ?: ""
    val query = uri.query ?: ""

    val isWatch = path == "/watch" && query.contains("v=")
    val isShorts = path.startsWith("/shorts/") && path.length > "/shorts/".length
    val isShortLink = isYoutuBe && path.length > 1
    val isEmbed = path.startsWith("/embed/") && path.length > "/embed/".length

    if (!isWatch && !isShorts && !isShortLink && !isEmbed) {
        return UrlValidationResult(valid = false, reason = "URL does not point to a single video")
    }

    return UrlValidationResult(valid = true, normalizedUrl = trimmed)
}
