package com.example.expensetracker.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.expensetracker.data.*

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val sessionManager = SessionManager(applicationContext)
        val dbHelper = LocalDatabaseHelper(applicationContext)
        val apiClient = ApiClient(sessionManager)
        val repository = DefaultDataRepository(dbHelper, apiClient, sessionManager)

        return try {
            val success = repository.syncWithServer()
            if (success) {
                Result.success()
            } else {
                // If it fails (e.g. server temporary down), retry later
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
