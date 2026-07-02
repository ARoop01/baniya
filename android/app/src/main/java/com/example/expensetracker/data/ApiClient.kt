package com.example.expensetracker.data

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ApiClient(
    private val sessionManager: SessionManager,
    private val baseUrl: String = "http://10.0.2.2:5000/api"
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val requestBuilder = chain.request().newBuilder()
            sessionManager.getToken()?.let { token ->
                requestBuilder.addHeader("Authorization", "Bearer $token")
            }
            chain.proceed(requestBuilder.build())
        }
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    // ================= AUTHENTICATION APIS =================
    fun register(name: String, email: String, password: String, currencyPreference: String): Result<User> {
        val payload = """
            {
                "name": "$name",
                "email": "$email",
                "password": "$password",
                "currencyPreference": "$currencyPreference"
            }
        """.trimIndent()

        val request = Request.Builder()
            .url("$baseUrl/auth/register")
            .post(payload.toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return Result.failure(Exception("Empty response"))
                // Parse auth response
                val jsonObject = json.parseToJsonElement(responseBody) as kotlinx.serialization.json.JsonObject
                val token = jsonObject["token"]?.toString()?.replace("\"", "") ?: ""
                sessionManager.saveToken(token)

                val userJson = jsonObject["user"].toString()
                val user = json.decodeFromString(User.serializer(), userJson)
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    fun login(email: String, password: String): Result<User> {
        val payload = """
            {
                "email": "$email",
                "password": "$password"
            }
        """.trimIndent()

        val request = Request.Builder()
            .url("$baseUrl/auth/login")
            .post(payload.toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return Result.failure(Exception("Empty response"))
                val jsonObject = json.parseToJsonElement(responseBody) as kotlinx.serialization.json.JsonObject
                val token = jsonObject["token"]?.toString()?.replace("\"", "") ?: ""
                sessionManager.saveToken(token)

                val userJson = jsonObject["user"].toString()
                val user = json.decodeFromString(User.serializer(), userJson)
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    fun updateProfile(name: String, currencyPreference: String): Result<User> {
        val payload = """
            {
                "name": "$name",
                "currencyPreference": "$currencyPreference"
            }
        """.trimIndent()

        val request = Request.Builder()
            .url("$baseUrl/auth/profile")
            .put(payload.toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return Result.failure(Exception("Empty response"))
                val jsonObject = json.parseToJsonElement(responseBody) as kotlinx.serialization.json.JsonObject
                val userJson = jsonObject["user"].toString()
                val user = json.decodeFromString(User.serializer(), userJson)
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    fun deleteAccount(): Result<Unit> {
        val request = Request.Builder()
            .url("$baseUrl/auth/profile")
            .delete()
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                sessionManager.clearSession()
                Result.success(Unit)
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    // ================= RECEIPT UPLOAD =================
    fun uploadReceipt(fileBytes: ByteArray, fileName: String): Result<String> {
        val mediaType = "image/*".toMediaType()
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("receipt", fileName, fileBytes.toRequestBody(mediaType))
            .build()

        val request = Request.Builder()
            .url("$baseUrl/expenses/upload-receipt")
            .post(requestBody)
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return Result.failure(Exception("Empty response"))
                val jsonObject = json.parseToJsonElement(responseBody) as kotlinx.serialization.json.JsonObject
                val receiptUrlSuffix = jsonObject["receiptUrl"]?.toString()?.replace("\"", "") ?: ""
                
                // Construct absolute URL
                val hostUrl = baseUrl.substringBefore("/api")
                Result.success("$hostUrl$receiptUrlSuffix")
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    // ================= SYNCHRONIZATION ENGINE =================
    fun sync(lastSyncTime: String?, changes: SyncChanges): Result<SyncResponse> {
        val syncRequest = SyncRequest(lastSyncTime, changes)
        val jsonPayload = json.encodeToString(SyncRequest.serializer(), syncRequest)

        val request = Request.Builder()
            .url("$baseUrl/sync")
            .post(jsonPayload.toRequestBody(jsonMediaType))
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return Result.failure(Exception("Empty response"))
                val syncResponse = json.decodeFromString(SyncResponse.serializer(), responseBody)
                Result.success(syncResponse)
            } else {
                val errorMsg = parseErrorMessage(response.body?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    private fun parseErrorMessage(jsonBody: String?): String {
        if (jsonBody.isNullOrEmpty()) return "Unknown error"
        return try {
            val element = json.parseToJsonElement(jsonBody) as kotlinx.serialization.json.JsonObject
            element["error"]?.toString()?.replace("\"", "") ?: "Unknown error"
        } catch (e: Exception) {
            "HTTP request error"
        }
    }
}
