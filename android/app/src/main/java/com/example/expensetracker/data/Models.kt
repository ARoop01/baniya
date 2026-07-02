package com.example.expensetracker.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int,
    val name: String,
    val email: String,
    @SerialName("currency_preference") val currencyPreference: String
)

@Serializable
data class Category(
    val id: String,
    @SerialName("user_id") val userId: Int? = null,
    val name: String,
    val icon: String,
    val color: String,
    @SerialName("is_default") val isDefault: Int = 0,
    @SerialName("is_deleted") val isDeleted: Int = 0,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class Expense(
    val id: String,
    val amount: Double,
    @SerialName("category_id") val categoryId: String,
    val date: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null,
    @SerialName("receipt_url") val receiptUrl: String? = null,
    @SerialName("recurring_rule_id") val recurringRuleId: String? = null,
    @SerialName("converted_amount") val convertedAmount: Double? = null,
    val currency: String? = null,
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("is_deleted") val isDeleted: Int = 0
)

@Serializable
data class Budget(
    val id: String,
    @SerialName("category_id") val categoryId: String? = null, // null means overall budget
    val amount: Double,
    val month: String, // YYYY-MM
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("is_deleted") val isDeleted: Int = 0
)

@Serializable
data class RecurringRule(
    val id: String,
    val amount: Double,
    @SerialName("category_id") val categoryId: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null,
    val frequency: String, // 'daily', 'weekly', 'monthly'
    @SerialName("next_trigger_date") val nextTriggerDate: String, // YYYY-MM-DD
    @SerialName("is_active") val isActive: Int = 1,
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("is_deleted") val isDeleted: Int = 0
)

@Serializable
data class Debt(
    val id: String,
    val type: String,
    val person: String,
    val amount: Double,
    @SerialName("repayment_type") val repaymentType: String,
    val months: Int = 1,
    @SerialName("monthly_amount") val monthlyAmount: Double,
    @SerialName("start_date") val startDate: String,
    @SerialName("deadline_date") val deadlineDate: String,
    @SerialName("remaining_amount") val remainingAmount: Double,
    @SerialName("last_payment_month") val lastPaymentMonth: String? = null,
    val notes: String? = null,
    val status: String = "active",
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("is_deleted") val isDeleted: Int = 0
)

@Serializable
data class SyncChanges(
    val categories: List<Category> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val budgets: List<Budget> = emptyList(),
    @SerialName("recurring_rules") val recurringRules: List<RecurringRule> = emptyList(),
    val debts: List<Debt> = emptyList()
)

@Serializable
data class SyncRequest(
    val lastSyncTime: String? = null,
    val changes: SyncChanges
)

@Serializable
data class SyncResponse(
    val syncTime: String,
    val changes: SyncChanges
)
