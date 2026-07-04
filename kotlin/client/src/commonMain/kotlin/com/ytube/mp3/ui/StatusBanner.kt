package com.ytube.mp3.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ytube.mp3.LocalAppState

@Composable
fun StatusBanner() {
    val state = LocalAppState.current
    val status = state.systemStatus ?: return

    val issues = buildList {
        if (!status.ytDlpAvailable) add("yt-dlp not found")
        if (!status.ffmpegAvailable) add("ffmpeg not found")
        if (!status.outputDirWritable) add("output directory not writable")
    }

    if (issues.isEmpty() && state.isConnected) return

    val (bg, text) = when {
        issues.isNotEmpty() -> Color(0xFFB71C1C) to "System error: ${issues.joinToString(", ")}"
        !state.isConnected -> Color(0xFF37474F) to "Connecting to server…"
        else -> return
    }

    Box(
        Modifier
            .fillMaxWidth()
            .background(bg)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(text, color = Color.White, style = MaterialTheme.typography.bodyMedium)
    }
}
