package com.ytube.mp3.services

import com.ytube.mp3.Config
import com.ytube.mp3.model.AppSettings
import com.ytube.mp3.model.AppState
import com.ytube.mp3.model.QueueItem
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

object StateStore {
    private val json = Json { prettyPrint = true; ignoreUnknownKeys = true }
    private val writeMutex = Mutex()

    @Volatile
    private var state: AppState = defaultState()

    fun load() {
        Config.dataDir.mkdirs()
        val file = Config.stateFile
        if (!file.exists()) {
            state = defaultState()
            writeSync(state)
            return
        }
        try {
            val parsed = json.decodeFromString<AppState>(file.readText())
            state = AppState(
                settings = mergeSettings(parsed.settings),
                queue = parsed.queue,
            )
        } catch (e: Exception) {
            val backup = File("${Config.stateFile}.corrupt-${System.currentTimeMillis()}")
            try {
                file.renameTo(backup)
                println("[StateStore] state.json corrupted (${e.message}). Backed up to $backup.")
            } catch (_: Exception) {
                println("[StateStore] Failed to back up corrupted state.json: ${e.message}")
            }
            state = defaultState()
            writeSync(state)
        }
    }

    fun getSettings(): AppSettings = state.settings
    fun getQueue(): MutableList<QueueItem> = state.queue

    suspend fun setSettings(settings: AppSettings) {
        state.settings = settings
        save()
    }

    fun setQueue(queue: MutableList<QueueItem>) {
        state.queue = queue
    }

    suspend fun save() {
        val snapshot = state.copy(
            queue = state.queue.toMutableList(),
            settings = state.settings,
        )
        writeMutex.withLock {
            writeAsync(snapshot)
        }
    }

    private fun writeSync(s: AppState) {
        val tmp = File("${Config.stateFile}.tmp")
        tmp.writeText(json.encodeToString(s))
        tmp.renameTo(Config.stateFile)
    }

    private fun writeAsync(s: AppState) {
        val tmp = File("${Config.stateFile}.tmp")
        tmp.writeText(json.encodeToString(s))
        tmp.renameTo(Config.stateFile)
    }

    private fun defaultState() = AppState(settings = Config.defaultSettings.copy())

    private fun mergeSettings(parsed: AppSettings): AppSettings {
        val d = Config.defaultSettings
        return AppSettings(
            outputDir = parsed.outputDir.ifBlank { d.outputDir },
            audioBitrateKbps = if (parsed.audioBitrateKbps > 0) parsed.audioBitrateKbps else d.audioBitrateKbps,
            filenameTemplate = parsed.filenameTemplate.ifBlank { d.filenameTemplate },
            maxQueueSize = if (parsed.maxQueueSize > 0) parsed.maxQueueSize else d.maxQueueSize,
            cookiesFilePath = parsed.cookiesFilePath,
            embedThumbnail = parsed.embedThumbnail,
            embedMetadata = parsed.embedMetadata,
        )
    }
}
