package com.ytube.mp3.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ytube.mp3.LocalAppState
import com.ytube.mp3.api.removeItem
import com.ytube.mp3.api.retryItem
import com.ytube.mp3.model.QueueItemDto
import kotlinx.coroutines.launch

@Composable
fun QueueList() {
    val state = LocalAppState.current
    val queue = state.queue

    if (queue.isEmpty()) {
        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
            Text("Queue is empty. Paste a YouTube URL above to start.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    LazyColumn(Modifier.fillMaxWidth()) {
        items(queue, key = { it.id }) { item ->
            QueueItemRow(item)
            HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
        }
    }
}

@Composable
private fun QueueItemRow(item: QueueItemDto) {
    val state = LocalAppState.current
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = item.title ?: item.url,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 1,
                )
                if (item.title != null) {
                    Text(item.url, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
            Spacer(Modifier.width(8.dp))
            StatusChip(item.status)
            Spacer(Modifier.width(4.dp))
            if (item.status == "error") {
                TextButton(onClick = {
                    scope.launch {
                        retryItem(state.serverUrl, item.id).onFailure { state.toastMessage = "Retry failed: ${it.message}" }
                    }
                }) { Text("Retry") }
            }
            IconButton(onClick = {
                scope.launch {
                    removeItem(state.serverUrl, item.id).onFailure { state.toastMessage = "Remove failed: ${it.message}" }
                }
            }) {
                Text("✕", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        if (item.status == "downloading" || item.status == "converting") {
            Spacer(Modifier.height(6.dp))
            ProgressBar(item.progress)
            Row(Modifier.padding(top = 2.dp)) {
                Text(
                    "${item.progress.toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                item.speed?.let {
                    Text(" · $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.eta?.let {
                    Text(" · ETA $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        if (item.status == "error" && item.error != null) {
            Text(item.error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (bg, fg, label) = when (status) {
        "queued" -> Triple(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, "Queued")
        "downloading" -> Triple(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.onPrimaryContainer, "Downloading")
        "converting" -> Triple(MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.onSecondaryContainer, "Converting")
        "done" -> Triple(MaterialTheme.colorScheme.tertiaryContainer, MaterialTheme.colorScheme.onTertiaryContainer, "Done")
        "error" -> Triple(MaterialTheme.colorScheme.errorContainer, MaterialTheme.colorScheme.onErrorContainer, "Error")
        else -> Triple(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, status)
    }
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(label, color = fg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}
