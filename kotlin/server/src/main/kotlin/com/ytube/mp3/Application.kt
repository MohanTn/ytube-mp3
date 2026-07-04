package com.ytube.mp3

import com.ytube.mp3.routes.*
import com.ytube.mp3.services.QueueManager
import com.ytube.mp3.services.StateStore
import com.ytube.mp3.services.runStartupChecks
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import java.io.File

fun main() = runBlocking {
    StateStore.load()
    runStartupChecks()
    QueueManager.recoverInterruptedItems()
    QueueManager.processNext()

    embeddedServer(Netty, port = Config.port) {
        install(SSE)
        install(CORS) {
            anyHost()
            allowMethod(HttpMethod.Options)
            allowMethod(HttpMethod.Delete)
            allowMethod(HttpMethod.Put)
            allowHeader(HttpHeaders.ContentType)
        }
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; prettyPrint = false })
        }

        routing {
            queueRoutes()
            settingsRoutes()
            systemRoutes()
            eventsRoutes()

            val clientDist = File("../client/build/dist/wasmJs/productionExecutable")
            if (clientDist.exists()) {
                staticFiles("/", clientDist) {
                    default("index.html")
                }
                get("{...}") {
                    call.respondFile(File(clientDist, "index.html"))
                }
            }
        }
    }.start(wait = true)
}
