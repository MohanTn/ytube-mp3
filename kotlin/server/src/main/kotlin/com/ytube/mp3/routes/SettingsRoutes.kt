package com.ytube.mp3.routes

import com.ytube.mp3.ValidationError
import com.ytube.mp3.services.getSettings
import com.ytube.mp3.services.updateSettings
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*

fun Route.settingsRoutes() {
    route("/api/settings") {
        get {
            call.respond(getSettings())
        }

        put {
            val body = call.receive<JsonObject>()
            val partial = body.mapValues { (_, v) ->
                val p = v.jsonPrimitive
                when {
                    p.isString -> p.content
                    p.booleanOrNull != null -> p.booleanOrNull
                    p.doubleOrNull != null -> p.doubleOrNull?.let {
                        if (it == it.toLong().toDouble()) it.toLong().toInt() else it
                    }
                    else -> null
                }
            }
            try {
                val updated = updateSettings(partial)
                call.respond(updated)
            } catch (e: ValidationError) {
                call.respond(HttpStatusCode.BadRequest, buildJsonObject {
                    put("errors", Json.encodeToJsonElement(e.fieldErrors))
                })
            }
        }
    }
}
