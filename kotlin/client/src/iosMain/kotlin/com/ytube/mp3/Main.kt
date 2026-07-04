package com.ytube.mp3

import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

// Called from Swift: Main_iosKt.MainViewController()
fun MainViewController(): UIViewController = ComposeUIViewController { App() }
