package com.ytube.mp3.services

import com.ytube.mp3.DownloadCanceledException
import com.ytube.mp3.NotFoundError
import com.ytube.mp3.ValidationError
import com.ytube.mp3.model.*
import com.ytube.mp3.utils.generateQueueItemId
import com.ytube.mp3.utils.validateYoutubeUrl
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.*
import java.time.Instant

private const val PROGRESS_PERSIST_INTERVAL_MS = 1500L

object QueueManager {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val mutex = Mutex()
    private val json = Json

    private var processing = false
    private var activeItemId: String? = null
    private var activeCancel: (suspend () -> Unit)? = null
    private var lastProgressPersist = 0L

    fun getQueue(): MutableList<QueueItem> = StateStore.getQueue()

    private fun broadcastQueue() {
        EventBus.broadcast(
            "queue:update",
            buildJsonObject { put("queue", json.encodeToJsonElement(getQueue())) },
        )
    }

    private suspend fun persistAndBroadcast() {
        StateStore.save()
        broadcastQueue()
    }

    suspend fun addItems(rawUrls: List<String>): AddItemsResult = mutex.withLock {
        val settings = StateStore.getSettings()
        val queue = getQueue()
        val added = mutableListOf<QueueItem>()
        val rejected = mutableListOf<RejectedUrl>()

        for (rawUrl in rawUrls) {
            if (queue.size + added.size >= settings.maxQueueSize) {
                rejected += RejectedUrl(rawUrl, "Queue is full (max ${settings.maxQueueSize})")
                continue
            }
            val result = validateYoutubeUrl(rawUrl)
            if (!result.valid) {
                rejected += RejectedUrl(rawUrl, result.reason ?: "Invalid URL")
                continue
            }
            val item = QueueItem(
                id = generateQueueItemId(),
                url = result.normalizedUrl!!,
                status = "queued",
                progress = 0.0,
                addedAt = Instant.now().toString(),
            )
            queue.add(item)
            added.add(item)
        }

        if (added.isNotEmpty()) {
            persistAndBroadcast()
            scope.launch { processNext() }
        }
        AddItemsResult(added, rejected)
    }

    suspend fun removeItem(id: String): QueueItem = mutex.withLock {
        val queue = getQueue()
        val index = queue.indexOfFirst { it.id == id }
        if (index == -1) throw NotFoundError("Queue item $id not found")

        val item = queue.removeAt(index)
        persistAndBroadcast()

        if (activeItemId == id) {
            activeCancel?.let { cancel -> scope.launch { cancel() } }
        }
        item
    }

    suspend fun retryItem(id: String): QueueItem = mutex.withLock {
        val item = getQueue().find { it.id == id }
            ?: throw NotFoundError("Queue item $id not found")
        if (item.status != "error") {
            throw ValidationError(
                "Only errored items can be retried",
                listOf(ValidationFieldError("status", "Item status is \"${item.status}\", not \"error\"")),
            )
        }
        item.status = "queued"
        item.progress = 0.0
        item.speed = null
        item.eta = null
        item.error = null
        item.startedAt = null
        item.finishedAt = null

        persistAndBroadcast()
        scope.launch { processNext() }
        item
    }

    suspend fun recoverInterruptedItems() {
        val queue = getQueue()
        val interrupted = queue.filter { it.status == "downloading" || it.status == "converting" }
        if (interrupted.isEmpty()) return

        interrupted.forEach { item ->
            item.status = "queued"
            item.progress = 0.0
            item.speed = null
            item.eta = null
            item.startedAt = null
        }
        StateStore.setQueue((interrupted + queue.filter { it !in interrupted }).toMutableList())
        cleanupPartialFiles(StateStore.getSettings().outputDir)
    }

    // Acquires mutex: safe to call from multiple concurrent callers
    suspend fun processNext() = mutex.withLock {
        if (processing) return@withLock
        if (!systemStatus.ytDlpAvailable || !systemStatus.ffmpegAvailable || !systemStatus.outputDirWritable) return@withLock

        val next = getQueue().firstOrNull { it.status == "queued" } ?: return@withLock

        processing = true
        activeItemId = next.id
        // Launch fire-and-forget so the mutex is released before the download starts
        scope.launch { runItem(next) }
    }

    private suspend fun runItem(item: QueueItem) {
        val settings = StateStore.getSettings()

        item.status = "downloading"
        item.startedAt = Instant.now().toString()
        item.progress = 0.0
        item.error = null
        persistAndBroadcast()

        // Best-effort title fetch (does not block or fail the download)
        scope.launch {
            val title = fetchTitle(item.url)
            if (title != null && getQueue().contains(item)) {
                item.title = title
                persistAndBroadcast()
            }
        }

        val handle = startDownload(item, settings, onProgress = { update ->
            handleProgress(item, update)
        }, scope = scope)

        mutex.withLock { activeCancel = handle.cancel }

        try {
            val outputPath = handle.deferred.await()
            if (getQueue().contains(item)) {
                item.status = "done"
                item.progress = 100.0
                item.speed = null
                item.eta = null
                item.outputPath = outputPath
                item.finishedAt = Instant.now().toString()
                persistAndBroadcast()
            }
        } catch (e: DownloadCanceledException) {
            // Item was removed externally; no state update needed
        } catch (e: Exception) {
            if (getQueue().contains(item)) {
                item.status = "error"
                item.error = e.message ?: "Unknown error"
                item.speed = null
                item.eta = null
                item.finishedAt = Instant.now().toString()
                persistAndBroadcast()
            }
        } finally {
            mutex.withLock {
                processing = false
                activeItemId = null
                activeCancel = null
            }
            processNext()
        }
    }

    private fun handleProgress(item: QueueItem, update: ProgressUpdate) {
        item.status = update.status
        item.progress = update.progress
        item.speed = update.speed
        item.eta = update.eta

        EventBus.broadcast(
            "item:progress",
            buildJsonObject {
                put("id", item.id)
                put("status", item.status)
                put("progress", item.progress.toString())
                put("speed", item.speed ?: "")
                put("eta", item.eta ?: "")
            }
        )

        val now = System.currentTimeMillis()
        if (now - lastProgressPersist > PROGRESS_PERSIST_INTERVAL_MS) {
            lastProgressPersist = now
            scope.launch { StateStore.save() }
        }
    }
}
