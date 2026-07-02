package com.example.expensetracker

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Login : NavKey
@Serializable data object Register : NavKey
@Serializable data object Dashboard : NavKey
@Serializable data object ExpenseList : NavKey
@Serializable data class AddEditExpense(val expenseId: String? = null) : NavKey
@Serializable data object Budget : NavKey
@Serializable data object Reports : NavKey
@Serializable data object Settings : NavKey

// Compatibility
@Serializable data object Main : NavKey
