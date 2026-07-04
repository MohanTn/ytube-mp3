package com.ytube.mp3.utils

import java.util.UUID

fun generateQueueItemId(): String = "q_${UUID.randomUUID().toString().replace("-", "").take(10)}"
