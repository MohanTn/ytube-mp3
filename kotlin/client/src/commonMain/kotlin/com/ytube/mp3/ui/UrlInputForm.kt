package com.ytube.mp3.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ytube.mp3.LocalAppState
import com.ytube.mp3.api.addUrls
import kotlinx.coroutines.launch

@Composable
fun UrlInputForm() {
    val state = LocalAppState.current
    val scope = rememberCoroutineScope()
    var input by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        Text("YouTube to MP3", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = { Text("https://www.youtube.com/watch?v=...") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                enabled = !loading,
            )
            Spacer(Modifier.width(8.dp))
            Button(
                onClick = {
                    val urls = input.lines().map { it.trim() }.filter { it.isNotEmpty() }
                    if (urls.isEmpty()) return@Button
                    scope.launch {
                        loading = true
                        addUrls(state.serverUrl, urls)
                            .onFailure { state.toastMessage = "Failed to add: ${it.message}" }
                        input = ""
                        loading = false
                    }
                },
                enabled = input.isNotBlank() && !loading,
            ) {
                Text(if (loading) "Adding…" else "Download")
            }
        }
        Text(
            "Paste one or more URLs (one per line)",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
