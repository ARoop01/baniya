package com.example.expensetracker.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.json.Json

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? {
        return prefs.getString(KEY_TOKEN, null)
    }

    fun saveUser(user: User) {
        val json = Json.encodeToString(User.serializer(), user)
        prefs.edit().putString(KEY_USER, json).apply()
    }

    fun getUser(): User? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            Json.decodeFromString(User.serializer(), json)
        } catch (e: Exception) {
            null
        }
    }

    fun saveLastSyncTime(time: String?) {
        prefs.edit().putString(KEY_LAST_SYNC, time).apply()
    }

    fun getLastSyncTime(): String? {
        return prefs.getString(KEY_LAST_SYNC, null)
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREF_NAME = "aura_finance_prefs"
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER = "current_user"
        private const val KEY_LAST_SYNC = "last_sync_time"
    }
}
