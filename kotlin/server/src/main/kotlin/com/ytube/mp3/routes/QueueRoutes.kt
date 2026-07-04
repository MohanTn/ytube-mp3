package com.ytube.mp3.routes

import com.ytube.mp3.NotFoundError
import com.ytube.mp3.ValidationError
import com.ytube.mp3.services.QueueManager
import com.ytube.mp3.services.systemStatus
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*

fun Route.queueRoutes() {
    route("/api/queue") {
        get {
            call.respond(
                buildJsonObject {
                    put("queue", Json.encodeToJsonElement(QueueManager.getQueue()))
                    put("systemStatus", Json.encodeToJsonElement(systemStatus))
                }
            )
        }

        post {
            val body = call.receive<JsonObject>()
            val urls: List<String> = when {
                body.containsKey("urls") -> body["urls"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
                body.containsKey("url") -> listOf(body["url"]!!.jsonPrimitive.content)
                else -> emptyList()
            }

            if (urls.isEmpty()) {
                call.respond(HttpStatusCode.BadRequest, buildJsonObject { put("error", "\"urls\" must be a non-empty array of strings") })
                return@post
            }

            val result = QueueManager.addItems(urls)
            call.respond(HttpStatusCode.Created, result)
        }

        delete("/{id}") {
            val id = call.parameters["id"]!!
            try {
                val removed = QueueManager.removeItem(id)
                call.respond(buildJsonObject { put("removed", true); put("id", removed.id) })
            } catch (e: NotFoundError) {
                call.respond(HttpStatusCode.NotFound, buildJsonObject { put("error", e.message ?: "Not found") })
            }
        }

        post("/{id}/retry") {
            val id = call.parameters["id"]!!
            try {
                val item = QueueManager.retryItem(id)
                call.respond(item)
            } catch (e: NotFoundError) {
                call.respond(HttpStatusCode.NotFound, buildJsonObject { put("error", e.message ?: "Not found") })
            } catch (e: ValidationError) {
                call.respond(HttpStatusCode.BadRequest, Json.encodeToJsonElement(e.fieldErrors))
            }
        }
    }
}
