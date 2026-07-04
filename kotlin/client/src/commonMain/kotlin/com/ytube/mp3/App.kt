package com.ytube.mp3

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ytube.mp3.api.connectSse
import com.ytube.mp3.ui.*

@Composable
fun App() {
    val state = remember { AppState() }

    LaunchedEffect(Unit) {
        connectSse(state)
    }

    CompositionLocalProvider(LocalAppState provides state) {
        MaterialTheme(colorScheme = darkColorScheme()) {
            Surface(modifier = Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxSize()) {
                    Column(Modifier.fillMaxSize()) {
                        StatusBanner()
                        UrlInputForm()
                        HorizontalDivider()

                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.End,
                        ) {
                            TextButton(onClick = { state.showSettings = !state.showSettings }) {
                                Text(if (state.showSettings) "Hide Settings" else "Settings")
                            }
                        }

                        if (state.showSettings) {
                            SettingsForm()
                            HorizontalDivider()
                        }

                        Box(Modifier.weight(1f)) {
                            QueueList()
                        }
                    }

                    state.toastMessage?.let { message ->
                        Snackbar(
                            modifier = Modifier.padding(16.dp).align(Alignment.BottomCenter),
                            action = {
                                TextButton(onClick = { state.toastMessage = null }) { Text("Dismiss") }
                            },
                        ) { Text(message) }
                    }
                }
            }
        }
    }
}
