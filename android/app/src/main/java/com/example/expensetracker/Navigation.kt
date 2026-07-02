package com.example.expensetracker

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.expensetracker.data.*
import com.example.expensetracker.ui.*
import kotlinx.coroutines.launch

@Composable
fun MainNavigation() {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    val dbHelper = remember { LocalDatabaseHelper(context) }
    val apiClient = remember { ApiClient(sessionManager) }
    val repository = remember { DefaultDataRepository(dbHelper, apiClient, sessionManager) }

    val startKey = if (repository.isLoggedIn()) Dashboard else Login
    val backStack = rememberNavBackStack(startKey)

    NavDisplay(
        backStack = backStack,
        onBack = { 
            if (backStack.size > 1) {
                backStack.removeLastOrNull()
            }
        },
        entryProvider = entryProvider {
            entry<Login> {
                LoginScreen(
                    repository = repository,
                    onLoginSuccess = {
                        // Clear stack and navigate to Dashboard
                        while (backStack.size > 0) {
                            backStack.removeLastOrNull()
                        }
                        backStack.add(Dashboard)
                    },
                    onNavigateToRegister = {
                        backStack.add(Register)
                    }
                )
            }
            entry<Register> {
                RegisterScreen(
                    repository = repository,
                    onRegisterSuccess = {
                        while (backStack.size > 0) {
                            backStack.removeLastOrNull()
                        }
                        backStack.add(Dashboard)
                    },
                    onNavigateToLogin = {
                        backStack.removeLastOrNull()
                    }
                )
            }
            entry<Dashboard> {
                MainAppShell(
                    repository = repository,
                    onNavigateToLogout = {
                        repository.logout()
                        while (backStack.size > 0) {
                            backStack.removeLastOrNull()
                        }
                        backStack.add(Login)
                    },
                    onNavigateToAddExpense = {
                        backStack.add(AddEditExpense(null))
                    },
                    onNavigateToEditExpense = { id ->
                        backStack.add(AddEditExpense(id))
                    }
                )
            }
            entry<AddEditExpense> { key ->
                AddEditExpenseScreen(
                    expenseId = key.expenseId,
                    repository = repository,
                    onBack = {
                        backStack.removeLastOrNull()
                    }
                )
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppShell(
    repository: DataRepository,
    onNavigateToLogout: () -> Unit,
    onNavigateToAddExpense: () -> Unit,
    onNavigateToEditExpense: (String) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Dash, 1: Expenses, 2: Budgets, 3: Reports, 4: Settings
    val titles = listOf("Dashboard", "Expenses", "Budgets", "Reports", "Settings")

    Scaffold(
        modifier = Modifier.fillMaxSize().background(Color(0xFF08090D)),
        topBar = {
            TopAppBar(
                title = { Text(titles[selectedTab], fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF11131C)),
                actions = {
                    IconButton(onClick = {
                        // Run sync in background
                        kotlinx.coroutines.GlobalScope.launch {
                            repository.syncWithServer()
                        }
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Sync Now", tint = Color.White)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF11131C)
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                    label = { Text("Home") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF8B5CF6),
                        selectedTextColor = Color(0xFF8B5CF6),
                        unselectedIconColor = Color.Gray,
                        unselectedTextColor = Color.Gray
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.List, contentDescription = "Expenses") },
                    label = { Text("Expenses") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF8B5CF6),
                        selectedTextColor = Color(0xFF8B5CF6),
                        unselectedIconColor = Color.Gray,
                        unselectedTextColor = Color.Gray
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Star, contentDescription = "Budgets") },
                    label = { Text("Budgets") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF8B5CF6),
                        selectedTextColor = Color(0xFF8B5CF6),
                        unselectedIconColor = Color.Gray,
                        unselectedTextColor = Color.Gray
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Info, contentDescription = "Reports") },
                    label = { Text("Reports") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF8B5CF6),
                        selectedTextColor = Color(0xFF8B5CF6),
                        unselectedIconColor = Color.Gray,
                        unselectedTextColor = Color.Gray
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF8B5CF6),
                        selectedTextColor = Color(0xFF8B5CF6),
                        unselectedIconColor = Color.Gray,
                        unselectedTextColor = Color.Gray
                    )
                )
            }
        },
        floatingActionButton = {
            if (selectedTab == 0 || selectedTab == 1) {
                FloatingActionButton(
                    onClick = onNavigateToAddExpense,
                    containerColor = Color(0xFF8B5CF6),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Expense")
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF08090D))
        ) {
            when (selectedTab) {
                0 -> DashboardScreen(
                    repository = repository,
                    onNavigateToAddExpense = onNavigateToAddExpense,
                    onNavigateToEditExpense = onNavigateToEditExpense
                )
                1 -> ExpenseListScreen(
                    repository = repository,
                    onNavigateToEditExpense = onNavigateToEditExpense
                )
                2 -> BudgetScreen(
                    repository = repository
                )
                3 -> ReportsScreen(
                    repository = repository
                )
                4 -> SettingsScreen(
                    repository = repository,
                    onLogout = onNavigateToLogout
                )
            }
        }
    }
}
