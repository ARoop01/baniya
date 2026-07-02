package com.example.expensetracker.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LocalDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        // Create Categories Table
        db.execSQL("""
            CREATE TABLE categories (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                updated_at TEXT NOT NULL
            )
        """)

        // Create Expenses Table
        db.execSQL("""
            CREATE TABLE expenses (
                id TEXT PRIMARY KEY,
                amount REAL NOT NULL,
                category_id TEXT NOT NULL,
                date TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                notes TEXT,
                receipt_url TEXT,
                recurring_rule_id TEXT,
                converted_amount REAL,
                currency TEXT,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )
        """)

        // Create Budgets Table
        db.execSQL("""
            CREATE TABLE budgets (
                id TEXT PRIMARY KEY,
                category_id TEXT,
                amount REAL NOT NULL,
                month TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )
        """)

        // Create Recurring Rules Table
        db.execSQL("""
            CREATE TABLE recurring_rules (
                id TEXT PRIMARY KEY,
                amount REAL NOT NULL,
                category_id TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                notes TEXT,
                frequency TEXT NOT NULL,
                next_trigger_date TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )
        """)

        // Create Debts Table
        db.execSQL("""
            CREATE TABLE debts (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                person TEXT NOT NULL,
                amount REAL NOT NULL,
                repayment_type TEXT NOT NULL,
                months INTEGER DEFAULT 1,
                monthly_amount REAL NOT NULL,
                start_date TEXT NOT NULL,
                deadline_date TEXT NOT NULL,
                remaining_amount REAL NOT NULL,
                last_payment_month TEXT,
                notes TEXT,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )
        """)

        // Seed Default Categories
        seedDefaultCategories(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS expenses")
        db.execSQL("DROP TABLE IF EXISTS categories")
        db.execSQL("DROP TABLE IF EXISTS budgets")
        db.execSQL("DROP TABLE IF EXISTS recurring_rules")
        db.execSQL("DROP TABLE IF EXISTS debts")
        onCreate(db)
    }

    private fun seedDefaultCategories(db: SQLiteDatabase) {
        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        val defaults = listOf(
            ContentValues().apply { put("id", "def-food"); put("name", "Food"); put("icon", "🍔"); put("color", "#EF4444"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-transport"); put("name", "Transport"); put("icon", "🚗"); put("color", "#3B82F6"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-ent"); put("name", "Entertainment"); put("icon", "🎬"); put("color", "#10B981"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-bills"); put("name", "Bills"); put("icon", "🔌"); put("color", "#F59E0B"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-shopping"); put("name", "Shopping"); put("icon", "🛍️"); put("color", "#EC4899"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-health"); put("name", "Health"); put("icon", "🏥"); put("color", "#8B5CF6"); put("is_default", 1); put("updated_at", now) },
            ContentValues().apply { put("id", "def-other"); put("name", "Other"); put("icon", "🏷️"); put("color", "#6B7280"); put("is_default", 1); put("updated_at", now) }
        )
        for (cv in defaults) {
            db.insert("categories", null, cv)
        }
    }

    // ================= EXPENSES CRUD =================
    fun getExpenses(): List<Expense> {
        val list = mutableListOf<Expense>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM expenses WHERE is_deleted = 0 ORDER BY date DESC", null)
        if (cursor.moveToFirst()) {
            do {
                list.add(cursorToExpense(cursor))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return list
    }

    fun saveExpense(expense: Expense) {
        val db = writableDatabase
        val cv = expenseToContentValues(expense)
        db.replace("expenses", null, cv)
    }

    fun deleteExpense(id: String) {
        val db = writableDatabase
        val exp = getExpenseById(id)
        if (exp != null) {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            val deletedExp = exp.copy(isDeleted = 1, updatedAt = now)
            db.replace("expenses", null, expenseToContentValues(deletedExp))
        }
    }

    fun getExpenseById(id: String): Expense? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM expenses WHERE id = ?", arrayOf(id))
        var exp: Expense? = null
        if (cursor.moveToFirst()) {
            exp = cursorToExpense(cursor)
        }
        cursor.close()
        return exp
    }

    // ================= CATEGORIES CRUD =================
    fun getCategories(): List<Category> {
        val list = mutableListOf<Category>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM categories WHERE is_deleted = 0", null)
        if (cursor.moveToFirst()) {
            do {
                list.add(cursorToCategory(cursor))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return list
    }

    fun saveCategory(category: Category) {
        val db = writableDatabase
        db.replace("categories", null, categoryToContentValues(category))
    }

    fun deleteCategory(id: String) {
        val db = writableDatabase
        val cat = getCategoryById(id)
        if (cat != null && cat.isDefault == 0) {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            val deletedCat = cat.copy(isDeleted = 1, updatedAt = now)
            db.replace("categories", null, categoryToContentValues(deletedCat))
        }
    }

    private fun getCategoryById(id: String): Category? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM categories WHERE id = ?", arrayOf(id))
        var cat: Category? = null
        if (cursor.moveToFirst()) {
            cat = cursorToCategory(cursor)
        }
        cursor.close()
        return cat
    }

    // ================= BUDGETS CRUD =================
    fun getBudgets(month: String): List<Budget> {
        val list = mutableListOf<Budget>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM budgets WHERE month = ? AND is_deleted = 0", arrayOf(month))
        if (cursor.moveToFirst()) {
            do {
                list.add(cursorToBudget(cursor))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return list
    }

    fun saveBudget(budget: Budget) {
        val db = writableDatabase
        db.replace("budgets", null, budgetToContentValues(budget))
    }

    fun getBudgetsAll(): List<Budget> {
        val list = mutableListOf<Budget>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM budgets WHERE is_deleted = 0", null)
        if (cursor.moveToFirst()) {
            do {
                list.add(cursorToBudget(cursor))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return list
    }

    // ================= RECURRING RULES CRUD =================
    fun getRecurringRules(): List<RecurringRule> {
        val list = mutableListOf<RecurringRule>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM recurring_rules WHERE is_deleted = 0", null)
        if (cursor.moveToFirst()) {
            do {
                list.add(cursorToRecurringRule(cursor))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return list
    }

    fun saveRecurringRule(rule: RecurringRule) {
        val db = writableDatabase
        db.replace("recurring_rules", null, recurringRuleToContentValues(rule))
    }

    fun deleteRecurringRule(id: String) {
        val db = writableDatabase
        val rule = getRecurringRuleById(id)
        if (rule != null) {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            val deletedRule = rule.copy(isDeleted = 1, updatedAt = now)
            db.replace("recurring_rules", null, recurringRuleToContentValues(deletedRule))
        }
    }

    private fun getRecurringRuleById(id: String): RecurringRule? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT * FROM recurring_rules WHERE id = ?", arrayOf(id))
        var rule: RecurringRule? = null
        if (cursor.moveToFirst()) {
            rule = cursorToRecurringRule(cursor)
        }
        cursor.close()
        return rule
    }

    // ================= SYNC AND MERGE ENGINE =================
    fun getChangesSince(lastSyncTime: String?): SyncChanges {
        val db = readableDatabase
        val cutoff = lastSyncTime ?: "1970-01-01T00:00:00.000Z"

        // 1. Get Expenses
        val expenses = mutableListOf<Expense>()
        val cursorEx = db.rawQuery("SELECT * FROM expenses WHERE updated_at > ?", arrayOf(cutoff))
        if (cursorEx.moveToFirst()) {
            do { expenses.add(cursorToExpense(cursorEx)) } while (cursorEx.moveToNext())
        }
        cursorEx.close()

        // 2. Get Categories
        val categories = mutableListOf<Category>()
        val cursorCat = db.rawQuery("SELECT * FROM categories WHERE is_default = 0 AND updated_at > ?", arrayOf(cutoff))
        if (cursorCat.moveToFirst()) {
            do { categories.add(cursorToCategory(cursorCat)) } while (cursorCat.moveToNext())
        }
        cursorCat.close()

        // 3. Get Budgets
        val budgets = mutableListOf<Budget>()
        val cursorBud = db.rawQuery("SELECT * FROM budgets WHERE updated_at > ?", arrayOf(cutoff))
        if (cursorBud.moveToFirst()) {
            do { budgets.add(cursorToBudget(cursorBud)) } while (cursorBud.moveToNext())
        }
        cursorBud.close()

        // 4. Get Recurring Rules
        val rules = mutableListOf<RecurringRule>()
        val cursorRule = db.rawQuery("SELECT * FROM recurring_rules WHERE updated_at > ?", arrayOf(cutoff))
        if (cursorRule.moveToFirst()) {
            do { rules.add(cursorToRecurringRule(cursorRule)) } while (cursorRule.moveToNext())
        }
        cursorRule.close()

        // 5. Get Debts
        val debts = mutableListOf<Debt>()
        val cursorDebt = db.rawQuery("SELECT * FROM debts WHERE updated_at > ?", arrayOf(cutoff))
        if (cursorDebt.moveToFirst()) {
            do { debts.add(cursorToDebt(cursorDebt)) } while (cursorDebt.moveToNext())
        }
        cursorDebt.close()

        return SyncChanges(categories, expenses, budgets, rules, debts)
    }

    fun applyServerChanges(changes: SyncChanges) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            // Apply Categories
            for (cat in changes.categories) {
                val existingCursor = db.rawQuery("SELECT updated_at FROM categories WHERE id = ?", arrayOf(cat.id))
                var shouldWrite = true
                if (existingCursor.moveToFirst()) {
                    val existingTime = existingCursor.getString(0)
                    if (existingTime >= cat.updatedAt) {
                        shouldWrite = false
                    }
                }
                existingCursor.close()
                if (shouldWrite) {
                    if (cat.isDeleted == 1) {
                        db.delete("categories", "id = ?", arrayOf(cat.id))
                    } else {
                        db.replace("categories", null, categoryToContentValues(cat))
                    }
                }
            }

            // Apply Expenses
            for (exp in changes.expenses) {
                val existingCursor = db.rawQuery("SELECT updated_at FROM expenses WHERE id = ?", arrayOf(exp.id))
                var shouldWrite = true
                if (existingCursor.moveToFirst()) {
                    val existingTime = existingCursor.getString(0)
                    if (existingTime >= exp.updatedAt) {
                        shouldWrite = false
                    }
                }
                existingCursor.close()
                if (shouldWrite) {
                    if (exp.isDeleted == 1) {
                        db.delete("expenses", "id = ?", arrayOf(exp.id))
                    } else {
                        db.replace("expenses", null, expenseToContentValues(exp))
                    }
                }
            }

            // Apply Budgets
            for (bud in changes.budgets) {
                val existingCursor = db.rawQuery("SELECT updated_at FROM budgets WHERE id = ?", arrayOf(bud.id))
                var shouldWrite = true
                if (existingCursor.moveToFirst()) {
                    val existingTime = existingCursor.getString(0)
                    if (existingTime >= bud.updatedAt) {
                        shouldWrite = false
                    }
                }
                existingCursor.close()
                if (shouldWrite) {
                    if (bud.isDeleted == 1) {
                        db.delete("budgets", "id = ?", arrayOf(bud.id))
                    } else {
                        db.replace("budgets", null, budgetToContentValues(bud))
                    }
                }
            }

            // Apply Recurring Rules
            for (rule in changes.recurringRules) {
                val existingCursor = db.rawQuery("SELECT updated_at FROM recurring_rules WHERE id = ?", arrayOf(rule.id))
                var shouldWrite = true
                if (existingCursor.moveToFirst()) {
                    val existingTime = existingCursor.getString(0)
                    if (existingTime >= rule.updatedAt) {
                        shouldWrite = false
                    }
                }
                existingCursor.close()
                if (shouldWrite) {
                    if (rule.isDeleted == 1) {
                        db.delete("recurring_rules", "id = ?", arrayOf(rule.id))
                    } else {
                        db.replace("recurring_rules", null, recurringRuleToContentValues(rule))
                    }
                }
            }

            // Apply Debts
            for (debt in changes.debts) {
                val existingCursor = db.rawQuery("SELECT updated_at FROM debts WHERE id = ?", arrayOf(debt.id))
                var shouldWrite = true
                if (existingCursor.moveToFirst()) {
                    val existingTime = existingCursor.getString(0)
                    if (existingTime >= debt.updatedAt) {
                        shouldWrite = false
                    }
                }
                existingCursor.close()
                if (shouldWrite) {
                    if (debt.isDeleted == 1) {
                        db.delete("debts", "id = ?", arrayOf(debt.id))
                    } else {
                        db.replace("debts", null, debtToContentValues(debt))
                    }
                }
            }

            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun clearAllData() {
        val db = writableDatabase
        db.delete("expenses", null, null)
        db.delete("categories", "is_default = 0", null)
        db.delete("budgets", null, null)
        db.delete("recurring_rules", null, null)
        db.delete("debts", null, null)
    }

    // ================= CURSOR MAPPING UTILITIES =================
    private fun cursorToExpense(c: Cursor): Expense {
        return Expense(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            amount = c.getDouble(c.getColumnIndexOrThrow("amount")),
            categoryId = c.getString(c.getColumnIndexOrThrow("category_id")),
            date = c.getString(c.getColumnIndexOrThrow("date")),
            paymentMethod = c.getString(c.getColumnIndexOrThrow("payment_method")),
            notes = c.getString(c.getColumnIndexOrThrow("notes")),
            receiptUrl = c.getString(c.getColumnIndexOrThrow("receipt_url")),
            recurringRuleId = c.getString(c.getColumnIndexOrThrow("recurring_rule_id")),
            convertedAmount = c.getDouble(c.getColumnIndexOrThrow("converted_amount")),
            currency = c.getString(c.getColumnIndexOrThrow("currency")),
            updatedAt = c.getString(c.getColumnIndexOrThrow("updated_at")),
            isDeleted = c.getInt(c.getColumnIndexOrThrow("is_deleted"))
        )
    }

    private fun expenseToContentValues(e: Expense): ContentValues {
        return ContentValues().apply {
            put("id", e.id)
            put("amount", e.amount)
            put("category_id", e.categoryId)
            put("date", e.date)
            put("payment_method", e.paymentMethod)
            put("notes", e.notes)
            put("receipt_url", e.receiptUrl)
            put("recurring_rule_id", e.recurringRuleId)
            put("converted_amount", e.convertedAmount ?: e.amount)
            put("currency", e.currency ?: "USD")
            put("updated_at", e.updatedAt)
            put("is_deleted", e.isDeleted)
        }
    }

    private fun cursorToCategory(c: Cursor): Category {
        val userIdVal = if (c.isNull(c.getColumnIndexOrThrow("user_id"))) null else c.getInt(c.getColumnIndexOrThrow("user_id"))
        return Category(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            userId = userIdVal,
            name = c.getString(c.getColumnIndexOrThrow("name")),
            icon = c.getString(c.getColumnIndexOrThrow("icon")),
            color = c.getString(c.getColumnIndexOrThrow("color")),
            isDefault = c.getInt(c.getColumnIndexOrThrow("is_default")),
            isDeleted = c.getInt(c.getColumnIndexOrThrow("is_deleted")),
            updatedAt = c.getString(c.getColumnIndexOrThrow("updated_at"))
        )
    }

    private fun categoryToContentValues(cat: Category): ContentValues {
        return ContentValues().apply {
            put("id", cat.id)
            put("user_id", cat.userId)
            put("name", cat.name)
            put("icon", cat.icon)
            put("color", cat.color)
            put("is_default", cat.isDefault)
            put("is_deleted", cat.isDeleted)
            put("updated_at", cat.updatedAt)
        }
    }

    private fun cursorToBudget(c: Cursor): Budget {
        return Budget(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            categoryId = c.getString(c.getColumnIndexOrThrow("category_id")),
            amount = c.getDouble(c.getColumnIndexOrThrow("amount")),
            month = c.getString(c.getColumnIndexOrThrow("month")),
            updatedAt = c.getString(c.getColumnIndexOrThrow("updated_at")),
            isDeleted = c.getInt(c.getColumnIndexOrThrow("is_deleted"))
        )
    }

    private fun budgetToContentValues(b: Budget): ContentValues {
        return ContentValues().apply {
            put("id", b.id)
            put("category_id", b.categoryId)
            put("amount", b.amount)
            put("month", b.month)
            put("updated_at", b.updatedAt)
            put("is_deleted", b.isDeleted)
        }
    }

    private fun cursorToRecurringRule(c: Cursor): RecurringRule {
        return RecurringRule(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            amount = c.getDouble(c.getColumnIndexOrThrow("amount")),
            categoryId = c.getString(c.getColumnIndexOrThrow("category_id")),
            paymentMethod = c.getString(c.getColumnIndexOrThrow("payment_method")),
            notes = c.getString(c.getColumnIndexOrThrow("notes")),
            frequency = c.getString(c.getColumnIndexOrThrow("frequency")),
            nextTriggerDate = c.getString(c.getColumnIndexOrThrow("next_trigger_date")),
            isActive = c.getInt(c.getColumnIndexOrThrow("is_active")),
            updatedAt = c.getString(c.getColumnIndexOrThrow("updated_at")),
            isDeleted = c.getInt(c.getColumnIndexOrThrow("is_deleted"))
        )
    }

    private fun recurringRuleToContentValues(r: RecurringRule): ContentValues {
        return ContentValues().apply {
            put("id", r.id)
            put("amount", r.amount)
            put("category_id", r.categoryId)
            put("payment_method", r.paymentMethod)
            put("notes", r.notes)
            put("frequency", r.frequency)
            put("next_trigger_date", r.nextTriggerDate)
            put("is_active", r.isActive)
            put("updated_at", r.updatedAt)
            put("is_deleted", r.isDeleted)
        }
    }

    private fun cursorToDebt(c: Cursor): Debt {
        return Debt(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            type = c.getString(c.getColumnIndexOrThrow("type")),
            person = c.getString(c.getColumnIndexOrThrow("person")),
            amount = c.getDouble(c.getColumnIndexOrThrow("amount")),
            repaymentType = c.getString(c.getColumnIndexOrThrow("repayment_type")),
            months = c.getInt(c.getColumnIndexOrThrow("months")),
            monthlyAmount = c.getDouble(c.getColumnIndexOrThrow("monthly_amount")),
            startDate = c.getString(c.getColumnIndexOrThrow("start_date")),
            deadlineDate = c.getString(c.getColumnIndexOrThrow("deadline_date")),
            remainingAmount = c.getDouble(c.getColumnIndexOrThrow("remaining_amount")),
            lastPaymentMonth = c.getString(c.getColumnIndexOrThrow("last_payment_month")),
            notes = c.getString(c.getColumnIndexOrThrow("notes")),
            status = c.getString(c.getColumnIndexOrThrow("status")),
            updatedAt = c.getString(c.getColumnIndexOrThrow("updated_at")),
            isDeleted = c.getInt(c.getColumnIndexOrThrow("is_deleted"))
        )
    }

    private fun debtToContentValues(d: Debt): ContentValues {
        return ContentValues().apply {
            put("id", d.id)
            put("type", d.type)
            put("person", d.person)
            put("amount", d.amount)
            put("repayment_type", d.repaymentType)
            put("months", d.months)
            put("monthly_amount", d.monthlyAmount)
            put("start_date", d.startDate)
            put("deadline_date", d.deadlineDate)
            put("remaining_amount", d.remainingAmount)
            put("last_payment_month", d.lastPaymentMonth)
            put("notes", d.notes)
            put("status", d.status)
            put("updated_at", d.updatedAt)
            put("is_deleted", d.isDeleted)
        }
    }

    companion object {
        private const val DATABASE_NAME = "aura_finance_local.db"
        private const val DATABASE_VERSION = 1
    }
}
