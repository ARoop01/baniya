package com.example.expensetracker.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.expensetracker.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*

// Helper color parsers
fun parseColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: Exception) {
        Color.Gray
    }
}

// Convert Base64 receipt to ImageBitmap
fun base64ToImageBitmap(base64Str: String?): ImageBitmap? {
    if (base64Str.isNullOrEmpty()) return null
    return try {
        val cleanStr = if (base64Str.startsWith("data:image")) {
            base64Str.substringAfter("base64,")
        } else {
            base64Str
        }
        val decodedBytes = Base64.decode(cleanStr, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        bitmap.asImageBitmap()
    } catch (e: Exception) {
        null
    }
}

// ================= 1. LOGIN SCREEN =================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    repository: DataRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF08090D)), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.fillMaxWidth(0.9f).padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("▲", fontSize = 36.sp, color = Color(0xFF8B5CF6))
                Spacer(modifier = Modifier.height(8.dp))
                Text("AuraFinance", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Sign in to your account", fontSize = 14.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = Color(0xFF2E3245),
                        focusedBorderColor = Color(0xFF8B5CF6)
                    )
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = Color(0xFF2E3245),
                        focusedBorderColor = Color(0xFF8B5CF6)
                    )
                )
                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (email.isBlank() || password.isBlank()) {
                            Toast.makeText(context, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        isLoading = true
                        scope.launch {
                            val res = repository.login(email.trim(), password)
                            isLoading = false
                            if (res.isSuccess) {
                                Toast.makeText(context, "Welcome back!", Toast.LENGTH_SHORT).show()
                                onLoginSuccess()
                            } else {
                                Toast.makeText(context, "Error: ${res.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Sign In")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))

                TextButton(onClick = onNavigateToRegister) {
                    Text("Don't have an account? Create one", color = Color(0xFF8B5CF6))
                }
            }
        }
    }
}

// ================= 2. REGISTER SCREEN =================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    repository: DataRepository,
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("USD") }
    var isLoading by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF08090D)), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.fillMaxWidth(0.9f).padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("▲", fontSize = 36.sp, color = Color(0xFF8B5CF6))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Create Account", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Get started with AuraFinance", fontSize = 14.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Full Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                // Currency selector dropdown
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        readOnly = true,
                        value = currency,
                        onValueChange = {},
                        label = { Text("Preferred Currency") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        listOf("USD", "EUR", "GBP", "INR", "JPY").forEach { code ->
                            DropdownMenuItem(
                                text = { Text(code) },
                                onClick = {
                                    currency = code
                                    expanded = false
                                }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (name.isBlank() || email.isBlank() || password.isBlank()) {
                            Toast.makeText(context, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        if (password.length < 6) {
                            Toast.makeText(context, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        isLoading = true
                        scope.launch {
                            val res = repository.register(name.trim(), email.trim(), password, currency)
                            isLoading = false
                            if (res.isSuccess) {
                                Toast.makeText(context, "Account registered!", Toast.LENGTH_SHORT).show()
                                onRegisterSuccess()
                            } else {
                                Toast.makeText(context, "Error: ${res.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Create Account")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))

                TextButton(onClick = onNavigateToLogin) {
                    Text("Already have an account? Sign In", color = Color(0xFF8B5CF6))
                }
            }
        }
    }
}

// ================= 3. DASHBOARD SCREEN =================
@Composable
fun DashboardScreen(
    repository: DataRepository,
    onNavigateToAddExpense: () -> Unit,
    onNavigateToEditExpense: (String) -> Unit
) {
    val expenses by repository.getExpensesFlow().collectAsState(initial = emptyList())
    val categories by repository.getCategoriesFlow().collectAsState(initial = emptyList())
    
    val currentMonthStr = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())
    val budgets by repository.getBudgetsFlow(currentMonthStr).collectAsState(initial = emptyList())

    val thisMonthExpenses = expenses.filter { it.date.startsWith(currentMonthStr) }
    val thisMonthSpent = thisMonthExpenses.sumOf { it.amount }
    
    val overallBudget = budgets.find { it.categoryId == null }
    val budgetProgress = if (overallBudget != null && overallBudget.amount > 0) {
        (thisMonthSpent / overallBudget.amount).toFloat()
    } else 0f

    val user = repository.getCurrentUser()
    val currencyPref = user?.currencyPreference ?: "USD"
    
    // Top Spending Category
    val catSpend = thisMonthExpenses.groupBy { it.categoryId }.mapValues { (_, list) -> list.sumOf { it.amount } }
    val topCatId = catSpend.maxByOrNull { it.value }?.key
    val topCatAmt = catSpend.maxByOrNull { it.value }?.value ?: 0.0
    val topCat = categories.find { it.id == topCatId }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Welcome, ${user?.name ?: "User"}",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "Personal Finance Overview",
                fontSize = 14.sp,
                color = Color.Gray
            )
        }

        // Stats Cards Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Spent Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("This Month's Spending", fontSize = 14.sp, color = Color.Gray)
                            Text("💰", fontSize = 16.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = String.format("%s%,.2f", currencyPref, thisMonthSpent),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                // Budget Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Remaining Budget", fontSize = 14.sp, color = Color.Gray)
                            Text("🛡️", fontSize = 16.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        val remaining = overallBudget?.let { maxOf(0.0, it.amount - thisMonthSpent) } ?: 0.0
                        Text(
                            text = if (overallBudget != null) String.format("%s%,.2f", currencyPref, remaining) else "--",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { budgetProgress.coerceAtMost(1f) },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                            color = if (budgetProgress >= 1f) Color.Red else if (budgetProgress >= 0.8f) Color.Yellow else Color.Green,
                            trackColor = Color(0xFF2E3245)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (overallBudget != null) "${(budgetProgress * 100).toInt()}% consumed of ${currencyPref}${overallBudget.amount}" else "No overall budget set",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }

                // Top Category Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Top Category", fontSize = 14.sp, color = Color.Gray)
                            Text("🔥", fontSize = 16.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (topCat != null) "${topCat.icon} ${topCat.name}" else "None",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (topCat != null) String.format("%s%,.2f spent", currencyPref, topCatAmt) else "No entries logged",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }

        // Custom Canvas Line Graph (Daily Spending Trend)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Last 7 Days Trend", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))

                    // Compute last 7 days values
                    val last7Days = (0..6).map { i ->
                        val cal = Calendar.getInstance()
                        cal.add(Calendar.DAY_OF_YEAR, -i)
                        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
                    }.reversed()

                    val dailyTotals = last7Days.map { d ->
                        expenses.filter { it.date == d && it.isDeleted == 0 }.sumOf { it.amount }
                    }

                    val maxVal = maxOf(10.0, dailyTotals.maxOrNull() ?: 10.0).toFloat()

                    Canvas(modifier = Modifier.fillMaxWidth().height(150.dp)) {
                        val spacing = size.width / 6f
                        val points = dailyTotals.mapIndexed { idx, amt ->
                            val x = idx * spacing
                            val y = size.height - (amt.toFloat() / maxVal) * size.height
                            Offset(x, y)
                        }

                        // Draw grid lines
                        drawLine(Color(0xFF2E3245), Offset(0f, 0f), Offset(size.width, 0f), 1f)
                        drawLine(Color(0xFF2E3245), Offset(0f, size.height/2), Offset(size.width, size.height/2), 1f)
                        drawLine(Color(0xFF2E3245), Offset(0f, size.height), Offset(size.width, size.height), 1f)

                        // Draw path line
                        for (i in 0 until points.size - 1) {
                            drawLine(
                                color = Color(0xFF8B5CF6),
                                start = points[i],
                                end = points[i+1],
                                strokeWidth = 6f
                            )
                        }
                    }
                }
            }
        }

        // Recent Activity List Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Recent Expenses", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                TextButton(onClick = onNavigateToAddExpense) {
                    Text("+ Add", color = Color(0xFF8B5CF6))
                }
            }
        }

        // Recent Expenses items
        val recentExps = expenses.take(5)
        if (recentExps.isEmpty()) {
            item {
                Text(
                    "No transactions logged yet.",
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(24.dp)
                )
            }
        } else {
            items(recentExps) { exp ->
                val cat = categories.find { it.id == exp.categoryId }
                ListItem(
                    headlineContent = { Text(exp.notes ?: "Expense", fontWeight = FontWeight.SemiBold, color = Color.White) },
                    supportingContent = { Text("${exp.date} • ${exp.paymentMethod}", color = Color.Gray, fontSize = 12.sp) },
                    leadingContent = {
                        Box(
                            modifier = Modifier.size(40.dp).clip(CircleShape).background(parseColor(cat?.color ?: "#6B7280").copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(cat?.icon ?: "🏷️", fontSize = 18.sp)
                        }
                    },
                    trailingContent = {
                        Text(
                            String.format("-%s%,.2f", exp.currency ?: currencyPref, exp.amount),
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFEF4444)
                        )
                    },
                    colors = ListItemDefaults.colors(containerColor = Color(0xFF11131C)),
                    modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable {
                        onNavigateToEditExpense(exp.id)
                    }
                )
            }
        }
    }
}

// ================= 4. EXPENSE LIST SCREEN =================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseListScreen(
    repository: DataRepository,
    onNavigateToEditExpense: (String) -> Unit
) {
    val expenses by repository.getExpensesFlow().collectAsState(initial = emptyList())
    val categories by repository.getCategoriesFlow().collectAsState(initial = emptyList())
    
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }
    var selectedPaymentMethod by remember { mutableStateOf<String?>(null) }

    val filtered = expenses.filter { exp ->
        (searchQuery.isBlank() || exp.notes?.contains(searchQuery, ignoreCase = true) == true) &&
        (selectedCategoryId == null || exp.categoryId == selectedCategoryId) &&
        (selectedPaymentMethod == null || exp.paymentMethod == selectedPaymentMethod)
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("All Expenses", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(12.dp))

        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search description...") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Quick Category Filter Row
        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (filtered.isEmpty()) {
                item {
                    Text("No matching transactions.", color = Color.Gray, modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center)
                }
            } else {
                items(filtered) { exp ->
                    val cat = categories.find { it.id == exp.categoryId }
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onNavigateToEditExpense(exp.id) },
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C))
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier.size(40.dp).clip(CircleShape).background(parseColor(cat?.color ?: "#6B7280").copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(cat?.icon ?: "🏷️", fontSize = 18.sp)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(exp.notes ?: "Expense", fontWeight = FontWeight.Bold, color = Color.White)
                                Text("${exp.date} • ${exp.paymentMethod}", fontSize = 11.sp, color = Color.Gray)
                            }
                            Text(
                                String.format("-%s%,.2f", exp.currency ?: "USD", exp.amount),
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEF4444)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ================= 5. ADD / EDIT EXPENSE SCREEN =================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditExpenseScreen(
    expenseId: String?,
    repository: DataRepository,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val categories by repository.getCategoriesFlow().collectAsState(initial = emptyList())
    
    var amount by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf("") }
    var dateStr by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())) }
    var paymentMethod by remember { mutableStateOf("Credit Card") }
    var notes by remember { mutableStateOf("") }
    var receiptBase64 by remember { mutableStateOf<String?>(null) }
    var isRecurring by remember { mutableStateOf(false) }
    var frequency by remember { mutableStateOf("monthly") }
    var recRuleId by remember { mutableStateOf<String?>(null) }

    var expandedCat by remember { mutableStateOf(false) }
    var expandedMethod by remember { mutableStateOf(false) }

    // Receipt picking launcher
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bitmap = BitmapFactory.decodeStream(inputStream)
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
                val bytes = outputStream.toByteArray()
                receiptBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
            } catch (e: Exception) {
                Toast.makeText(context, "Error processing receipt image", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Load existing values for Edit
    LaunchedEffect(expenseId) {
        if (!expenseId.isNullOrEmpty()) {
            val exp = withContext(Dispatchers.IO) { repository.getExpenseById(expenseId) }
            if (exp != null) {
                amount = exp.amount.toString()
                categoryId = exp.categoryId
                dateStr = exp.date
                paymentMethod = exp.paymentMethod
                notes = exp.notes ?: ""
                receiptBase64 = exp.receiptUrl
                isRecurring = exp.recurringRuleId != null
                recRuleId = exp.recurringRuleId
            }
        }
    }

    // Auto assign categoryId if empty and categories are loaded
    if (categoryId.isEmpty() && categories.isNotEmpty()) {
        categoryId = categories.first().id
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = Color.White) }
            Text(if (expenseId == null) "Log Expense" else "Edit Expense", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = amount,
            onValueChange = { amount = it },
            label = { Text("Amount") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Category dropdown
        ExposedDropdownMenuBox(
            expanded = expandedCat,
            onExpandedChange = { expandedCat = !expandedCat },
            modifier = Modifier.fillMaxWidth()
        ) {
            val currentCat = categories.find { it.id == categoryId }
            OutlinedTextField(
                readOnly = true,
                value = if (currentCat != null) "${currentCat.icon} ${currentCat.name}" else "Select Category",
                onValueChange = {},
                label = { Text("Category") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCat) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = expandedCat,
                onDismissRequest = { expandedCat = false }
            ) {
                categories.forEach { cat ->
                    DropdownMenuItem(
                        text = { Text("${cat.icon} ${cat.name}") },
                        onClick = {
                            categoryId = cat.id
                            expandedCat = false
                        }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        // Date selector (simple string input for fallback)
        OutlinedTextField(
            value = dateStr,
            onValueChange = { dateStr = it },
            label = { Text("Date (YYYY-MM-DD)") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Payment Method dropdown
        ExposedDropdownMenuBox(
            expanded = expandedMethod,
            onExpandedChange = { expandedMethod = !expandedMethod },
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedTextField(
                readOnly = true,
                value = paymentMethod,
                onValueChange = {},
                label = { Text("Payment Method") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedMethod) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = expandedMethod,
                onDismissRequest = { expandedMethod = false }
            ) {
                listOf("Cash", "Credit Card", "Debit Card", "Bank Transfer", "Other").forEach { method ->
                    DropdownMenuItem(
                        text = { Text(method) },
                        onClick = {
                            paymentMethod = method
                            expandedMethod = false
                        }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Notes / Description") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))

        // Receipt photo layout
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text("Receipt Image", color = Color.White)
            Button(
                onClick = { galleryLauncher.launch("image/*") },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E3245))
            ) {
                Text("Select File", color = Color.White)
            }
        }

        base64ToImageBitmap(receiptBase64)?.let { img ->
            Spacer(modifier = Modifier.height(8.dp))
            Box(modifier = Modifier.size(100.dp).clip(RoundedCornerShape(8.dp))) {
                androidx.compose.foundation.Image(
                    bitmap = img,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
            }
        }
        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                val amtVal = amount.toDoubleOrNull()
                if (amtVal == null || amtVal <= 0) {
                    Toast.makeText(context, "Provide a valid amount", Toast.LENGTH_SHORT).show()
                    return@Button
                }

                scope.launch {
                    val expUuid = expenseId ?: UUID.randomUUID().toString()
                    val targetRuleId = if (isRecurring) UUID.randomUUID().toString() else null
                    
                    if (isRecurring && expenseId == null) {
                        val cal = Calendar.getInstance()
                        if (frequency == "daily") cal.add(Calendar.DAY_OF_YEAR, 1)
                        else if (frequency == "weekly") cal.add(Calendar.DAY_OF_YEAR, 7)
                        else if (frequency == "monthly") cal.add(Calendar.MONTH, 1)
                        val nextTrigger = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)

                        val rule = RecurringRule(
                            id = targetRuleId!!,
                            amount = amtVal,
                            categoryId = categoryId,
                            paymentMethod = paymentMethod,
                            notes = notes,
                            frequency = frequency,
                            nextTriggerDate = nextTrigger,
                            updatedAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                        )
                        repository.addRecurringRule(rule)
                    }

                    val newExp = Expense(
                        id = expUuid,
                        amount = amtVal,
                        categoryId = categoryId,
                        date = dateStr,
                        paymentMethod = paymentMethod,
                        notes = notes,
                        receiptUrl = receiptBase64,
                        recurringRuleId = targetRuleId ?: recRuleId,
                        updatedAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                    )
                    repository.addExpense(newExp)
                    Toast.makeText(context, "Saved successfully!", Toast.LENGTH_SHORT).show()
                    
                    // Trigger background upload sync
                    repository.syncWithServer()
                    onBack()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6))
        ) {
            Text("Save Expense")
        }
    }
}

// ================= 6. BUDGETS SCREEN =================
@Composable
fun BudgetScreen(repository: DataRepository) {
    val currentMonthStr = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())
    val budgets by repository.getBudgetsFlow(currentMonthStr).collectAsState(initial = emptyList())
    val expenses by repository.getExpensesFlow().collectAsState(initial = emptyList())
    val categories by repository.getCategoriesFlow().collectAsState(initial = emptyList())

    val totalSpent = expenses.filter { it.date.startsWith(currentMonthStr) }.sumOf { it.amount }
    val user = repository.getCurrentUser()
    val currencyPref = user?.currencyPreference ?: "USD"

    var budgetAmtStr by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val overallBudget = budgets.find { it.categoryId == null }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("Monthly Budget Status", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C))) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Define Overall Monthly Limit", fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = budgetAmtStr,
                            onValueChange = { budgetAmtStr = it },
                            placeholder = { Text("0.00") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Button(
                            onClick = {
                                val amtVal = budgetAmtStr.toDoubleOrNull()
                                if (amtVal == null || amtVal <= 0) return@Button
                                scope.launch {
                                    val bId = overallBudget?.id ?: UUID.randomUUID().toString()
                                    val newBudget = Budget(
                                        id = bId,
                                        categoryId = null,
                                        amount = amtVal,
                                        month = currentMonthStr,
                                        updatedAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                                    )
                                    repository.addBudget(newBudget)
                                    budgetAmtStr = ""
                                    Toast.makeText(context, "Overall Budget set!", Toast.LENGTH_SHORT).show()
                                    repository.syncWithServer()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6))
                        ) {
                            Text("Set")
                        }
                    }
                }
            }
        }

        if (overallBudget != null) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C))) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Overall Monthly Target", fontWeight = FontWeight.Bold, color = Color.White)
                            Text(String.format("Limit: %s%,.2f", currencyPref, overallBudget.amount), color = Color.Gray)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        val pct = (totalSpent / overallBudget.amount).toFloat()
                        LinearProgressIndicator(
                            progress = { pct.coerceAtMost(1f) },
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                            color = if (pct >= 1f) Color.Red else if (pct >= 0.8f) Color.Yellow else Color.Green,
                            trackColor = Color(0xFF2E3245)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(String.format("Spent: %s%,.2f", currencyPref, totalSpent), fontSize = 12.sp, color = Color.Gray)
                            Text("${(pct * 100).toInt()}% consumed", fontSize = 12.sp, color = if (pct >= 1f) Color.Red else Color.Gray)
                        }
                    }
                }
            }
        }
    }
}

// ================= 7. REPORTS SCREEN =================
@Composable
fun ReportsScreen(repository: DataRepository) {
    val expenses by repository.getExpensesFlow().collectAsState(initial = emptyList())
    val categories by repository.getCategoriesFlow().collectAsState(initial = emptyList())
    val user = repository.getCurrentUser()
    val currencyPref = user?.currencyPreference ?: "USD"

    // Default to last 30 days
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val startStr = remember { 
        val c = Calendar.getInstance()
        c.add(Calendar.DAY_OF_YEAR, -30)
        mutableStateOf(sdf.format(c.time))
    }
    val endStr = remember { mutableStateOf(sdf.format(Date())) }

    val filtered = expenses.filter { it.date >= startStr.value && it.date <= endStr.value }
    val total = filtered.sumOf { it.amount }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("Period Summary Report", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = startStr.value,
                    onValueChange = { startStr.value = it },
                    label = { Text("From") },
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endStr.value,
                    onValueChange = { endStr.value = it },
                    label = { Text("To") },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C))) {
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceAround) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Total Spent", color = Color.Gray, fontSize = 12.sp)
                        Text(String.format("%s%,.2f", currencyPref, total), fontWeight = FontWeight.Bold, color = Color(0xFF8B5CF6), fontSize = 18.sp)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Entries count", color = Color.Gray, fontSize = 12.sp)
                        Text("${filtered.size}", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
                    }
                }
            }
        }

        // Canvas Pie Chart for category breakdown
        item {
            val catTotals = filtered.groupBy { it.categoryId }.mapValues { it.value.sumOf { it.amount } }
            if (catTotals.isNotEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C)), modifier = Modifier.padding(vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Category Share", fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.fillMaxWidth())
                        Spacer(modifier = Modifier.height(16.dp))

                        val totalVal = catTotals.values.sum().toFloat()
                        
                        Canvas(modifier = Modifier.size(160.dp)) {
                            var startAngle = 0f
                            catTotals.forEach { (catId, amt) ->
                                val cat = categories.find { it.id == catId }
                                val color = parseColor(cat?.color ?: "#6B7280")
                                val sweepAngle = (amt.toFloat() / totalVal) * 360f

                                drawArc(
                                    color = color,
                                    startAngle = startAngle,
                                    sweepAngle = sweepAngle,
                                    useCenter = true,
                                    size = Size(size.width, size.height)
                                )
                                startAngle += sweepAngle
                            }
                        }
                    }
                }
            }
        }
    }
}

// ================= 8. SETTINGS SCREEN =================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repository: DataRepository, onLogout: () -> Unit) {
    val user = repository.getCurrentUser()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    
    var name by remember { mutableStateOf(user?.name ?: "") }
    var currency by remember { mutableStateOf(user?.currencyPreference ?: "USD") }
    var expanded by remember { mutableStateOf(false) }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("Settings & Profile", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11131C))) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Profile Configuration", fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedTextField(
                            readOnly = true,
                            value = currency,
                            onValueChange = {},
                            label = { Text("Base Currency") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            listOf("USD", "EUR", "GBP", "INR", "JPY").forEach { code ->
                                DropdownMenuItem(
                                    text = { Text(code) },
                                    onClick = {
                                        currency = code
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            scope.launch {
                                val result = repository.register(name, user?.email ?: "", "", currency) // simple mock update
                                Toast.makeText(context, "Settings updated successfully!", Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Save Settings")
                    }
                }
            }
        }

        item {
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Logout Account")
            }
        }
    }
}
