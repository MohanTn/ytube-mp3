package com.ytube.mp3.routes

import com.ytube.mp3.services.systemStatus
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.systemRoutes() {
    route("/api/system") {
        get("/status") {
            call.respond(systemStatus)
        }
    }
}
