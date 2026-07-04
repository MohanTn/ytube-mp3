package com.ytube.mp3.services

import com.ytube.mp3.Config
import com.ytube.mp3.ValidationError
import com.ytube.mp3.model.AppSettings
import com.ytube.mp3.model.ValidationFieldError
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.encodeToJsonElement
import java.io.File

private val TEMPLATE_PLACEHOLDER_RE = Regex("""%\([a-zA-Z_]+\)s""")

fun getSettings(): AppSettings = StateStore.getSettings()

suspend fun updateSettings(partial: Map<String, Any?>): AppSettings {
    val errors = validateSettingsUpdate(partial)
    if (errors.isNotEmpty()) throw ValidationError("Invalid settings", errors)

    val current = StateStore.getSettings()
    val updated = current.copy(
        outputDir = partial.getTyped("outputDir") ?: current.outputDir,
        audioBitrateKbps = partial.getTyped("audioBitrateKbps") ?: current.audioBitrateKbps,
        filenameTemplate = partial.getTyped("filenameTemplate") ?: current.filenameTemplate,
        maxQueueSize = partial.getTyped("maxQueueSize") ?: current.maxQueueSize,
        cookiesFilePath = partial.getTyped("cookiesFilePath") ?: current.cookiesFilePath,
        embedThumbnail = partial.getTyped("embedThumbnail") ?: current.embedThumbnail,
        embedMetadata = partial.getTyped("embedMetadata") ?: current.embedMetadata,
    )
    StateStore.setSettings(updated)

    val json = Json
    EventBus.broadcast("settings:update", json.encodeToJsonElement(updated))

    if (partial.containsKey("outputDir")) {
        refreshOutputDirStatus(updated.outputDir)
        EventBus.broadcast("system:status", json.encodeToJsonElement(systemStatus))
    }

    return updated
}

fun validateSettingsUpdate(partial: Map<String, Any?>): List<ValidationFieldError> {
    val errors = mutableListOf<ValidationFieldError>()

    partial["outputDir"]?.let { v ->
        val dir = v as? String
        if (dir == null || !File(dir).isAbsolute) {
            errors += ValidationFieldError("outputDir", "Output directory must be an absolute path")
        } else {
            try {
                File(dir).mkdirs()
                if (!File(dir).canWrite()) throw Exception("not writable")
            } catch (e: Exception) {
                errors += ValidationFieldError("outputDir", "Directory is not writable: ${e.message}")
            }
        }
    }

    partial["audioBitrateKbps"]?.let { v ->
        val bitrate = (v as? Number)?.toInt()
        if (bitrate == null || bitrate !in Config.allowedBitrates) {
            errors += ValidationFieldError("audioBitrateKbps", "Bitrate must be one of: ${Config.allowedBitrates.joinToString()}")
        }
    }

    partial["filenameTemplate"]?.let { v ->
        val err = validateFilenameTemplate(v as? String ?: "")
        if (err != null) errors += ValidationFieldError("filenameTemplate", err)
    }

    partial["maxQueueSize"]?.let { v ->
        val size = (v as? Number)?.toInt()
        if (size == null || size < 1) {
            errors += ValidationFieldError("maxQueueSize", "Max queue size must be a positive integer")
        }
    }

    partial["cookiesFilePath"]?.let { v ->
        val path = v as? String ?: ""
        if (path.isNotBlank()) {
            if (!File(path).isAbsolute) {
                errors += ValidationFieldError("cookiesFilePath", "Cookies file path must be an absolute path")
            } else if (!File(path).exists()) {
                errors += ValidationFieldError("cookiesFilePath", "Cookies file does not exist")
            }
        }
    }

    partial["embedThumbnail"]?.let { v ->
        if (v !is Boolean) errors += ValidationFieldError("embedThumbnail", "Must be a boolean")
    }
    partial["embedMetadata"]?.let { v ->
        if (v !is Boolean) errors += ValidationFieldError("embedMetadata", "Must be a boolean")
    }

    return errors
}

fun validateFilenameTemplate(template: String): String? {
    if (template.isBlank()) return "Filename template must be a non-empty string"
    if (template.contains("/") || template.contains("\\") || template.contains("..")) {
        return "Filename template cannot contain path separators or \"..\""
    }
    for (placeholder in TEMPLATE_PLACEHOLDER_RE.findAll(template).map { it.value }) {
        if (placeholder !in Config.allowedTemplatePlaceholders) {
            return "Placeholder $placeholder is not allowed. Allowed: ${Config.allowedTemplatePlaceholders.joinToString()}"
        }
    }
    if (!template.contains("%(ext)s")) return "Filename template must include %(ext)s"
    return null
}

@Suppress("UNCHECKED_CAST")
private inline fun <reified T> Map<String, Any?>.getTyped(key: String): T? =
    if (containsKey(key)) get(key) as? T else null
