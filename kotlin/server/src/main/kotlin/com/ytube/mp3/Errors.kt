package com.ytube.mp3

import com.ytube.mp3.model.ValidationFieldError

class ValidationError(message: String, val fieldErrors: List<ValidationFieldError>) : Exception(message)

class NotFoundError(message: String) : Exception(message)

class DownloadCanceledException : Exception("Download canceled")
