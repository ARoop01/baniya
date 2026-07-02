package com.example.expensetracker.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext

interface DataRepository {
    val data: Flow<List<String>> // Compatibility dummy
    
    fun getExpensesFlow(): Flow<List<Expense>>
    fun getExpenseById(id: String): Expense?
    fun getCategoriesFlow(): Flow<List<Category>>
    fun getBudgetsFlow(month: String): Flow<List<Budget>>
    fun getRecurringRulesFlow(): Flow<List<RecurringRule>>
    
    suspend fun addExpense(expense: Expense)
    suspend fun deleteExpense(id: String)
    suspend fun addCategory(category: Category)
    suspend fun deleteCategory(id: String)
    suspend fun addBudget(budget: Budget)
    suspend fun addRecurringRule(rule: RecurringRule)
    suspend fun deleteRecurringRule(id: String)
    
    suspend fun syncWithServer(): Boolean
    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(name: String, email: String, password: String, currency: String): Result<User>
    fun logout()
    fun getCurrentUser(): User?
    fun isLoggedIn(): Boolean
}

class DefaultDataRepository(
    private val dbHelper: LocalDatabaseHelper,
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) : DataRepository {
    
    // Compatibility dummy flow
    override val data: Flow<List<String>> = flow { emit(listOf("Android")) }

    // Shared flow to trigger UI re-renders on local changes
    private val changeTrigger = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private fun notifyDataChanged() {
        changeTrigger.tryEmit(Unit)
    }

    override fun getExpensesFlow(): Flow<List<Expense>> = flow {
        // First emit current cache
        emit(dbHelper.getExpenses())
        // Keep listening for updates
        changeTrigger.collect {
            emit(dbHelper.getExpenses())
        }
    }.flowOn(Dispatchers.IO)

    override fun getExpenseById(id: String): Expense? {
        return dbHelper.getExpenseById(id)
    }

    override fun getCategoriesFlow(): Flow<List<Category>> = flow {
        emit(dbHelper.getCategories())
        changeTrigger.collect {
            emit(dbHelper.getCategories())
        }
    }.flowOn(Dispatchers.IO)

    override fun getBudgetsFlow(month: String): Flow<List<Budget>> = flow {
        emit(dbHelper.getBudgets(month))
        changeTrigger.collect {
            emit(dbHelper.getBudgets(month))
        }
    }.flowOn(Dispatchers.IO)

    override fun getRecurringRulesFlow(): Flow<List<RecurringRule>> = flow {
        emit(dbHelper.getRecurringRules())
        changeTrigger.collect {
            emit(dbHelper.getRecurringRules())
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun addExpense(expense: Expense) = withContext(Dispatchers.IO) {
        dbHelper.saveExpense(expense)
        notifyDataChanged()
    }

    override suspend fun deleteExpense(id: String) = withContext(Dispatchers.IO) {
        dbHelper.deleteExpense(id)
        notifyDataChanged()
    }

    override suspend fun addCategory(category: Category) = withContext(Dispatchers.IO) {
        dbHelper.saveCategory(category)
        notifyDataChanged()
    }

    override suspend fun deleteCategory(id: String) = withContext(Dispatchers.IO) {
        dbHelper.deleteCategory(id)
        notifyDataChanged()
    }

    override suspend fun addBudget(budget: Budget) = withContext(Dispatchers.IO) {
        dbHelper.saveBudget(budget)
        notifyDataChanged()
    }

    override suspend fun addRecurringRule(rule: RecurringRule) = withContext(Dispatchers.IO) {
        dbHelper.saveRecurringRule(rule)
        notifyDataChanged()
    }

    override suspend fun deleteRecurringRule(id: String) = withContext(Dispatchers.IO) {
        dbHelper.deleteRecurringRule(id)
        notifyDataChanged()
    }

    override suspend fun syncWithServer(): Boolean = withContext(Dispatchers.IO) {
        if (sessionManager.getToken() == null) return@withContext false
        
        try {
            val lastSyncTime = sessionManager.getLastSyncTime()
            // 1. Fetch local dirty changes
            val localChanges = dbHelper.getChangesSince(lastSyncTime)
            
            // 2. Upload to server sync endpoint and fetch delta
            val result = apiClient.sync(lastSyncTime, localChanges)
            if (result.isSuccess) {
                val response = result.getOrThrow()
                
                // 3. Apply server delta changes locally
                dbHelper.applyServerChanges(response.changes)
                
                // 4. Update sync timestamp in metadata
                sessionManager.saveLastSyncTime(response.syncTime)
                
                notifyDataChanged()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    override suspend fun login(email: String, password: String): Result<User> = withContext(Dispatchers.IO) {
        val result = apiClient.login(email, password)
        if (result.isSuccess) {
            // clear old cache
            dbHelper.clearAllData()
            sessionManager.saveLastSyncTime(null) // trigger full sync
            notifyDataChanged()
        }
        result
    }

    override suspend fun register(name: String, email: String, password: String, currency: String): Result<User> = withContext(Dispatchers.IO) {
        val result = apiClient.register(name, email, password, currency)
        if (result.isSuccess) {
            dbHelper.clearAllData()
            sessionManager.saveLastSyncTime(null)
            notifyDataChanged()
        }
        result
    }

    override fun logout() {
        dbHelper.clearAllData()
        sessionManager.clearSession()
        notifyDataChanged()
    }

    override fun getCurrentUser(): User? {
        return sessionManager.getUser()
    }

    override fun isLoggedIn(): Boolean {
        return sessionManager.getToken() != null
    }
}
