# Personal Expense Tracker Implementation Plan

A comprehensive design and implementation plan for a Personal Expense Tracker with a responsive Web Dashboard, a Jetpack Compose Android application, and a shared Express.js/SQLite backend supporting offline capability and synchronization.

## User Review Required

> [!IMPORTANT]
> **Authentication & Session Persistence**: We will use JWT (JSON Web Tokens) stored in `localStorage` for the web application and encrypted Shared Preferences for the Android application.
> **Offline Sync Strategy**: We will implement a Last-Write-Wins (LWW) conflict resolution strategy using `updated_at` timestamps. Each entity (expenses, custom categories, budgets, recurring rules) will have a UUID/string identifier generated client-side to prevent database key collisions.
> **Receipt Upload**: Receipts will be uploaded as multipart form-data to the backend, saved in an `uploads/` folder, and served statically.

## Proposed Changes

### Component 1: Shared Backend Server (`/backend`)
A Node.js + Express application using SQLite for relational data persistence.

#### [NEW] [package.json](file:///d:/ExpenseTracker.v2/backend/package.json)
Contains backend dependencies: `express`, `sqlite3`, `bcryptjs`, `jsonwebtoken`, `multer`, `cors`, `dotenv`.

#### [NEW] [database.js](file:///d:/ExpenseTracker.v2/backend/database.js)
Initializes the SQLite database (`expenses.db`) and defines the tables with appropriate columns including `updated_at` and `is_deleted` (soft deletes) to support synchronization:
- `users`: ID, name, email, password_hash, currency_preference.
- `categories`: ID (string/UUID), user_id (nullable for defaults), name, icon, color, is_deleted.
- `expenses`: ID (UUID), user_id, amount, category_id, date, payment_method, notes, receipt_url, recurring_rule_id, converted_amount, currency, updated_at, is_deleted.
- `budgets`: ID (string/UUID), user_id, category_id (nullable for overall), amount, month (YYYY-MM), updated_at, is_deleted.
- `recurring_rules`: ID (UUID), user_id, amount, category_id, payment_method, notes, frequency (daily, weekly, monthly), next_trigger_date, is_active, updated_at, is_deleted.

#### [NEW] [server.js](file:///d:/ExpenseTracker.v2/backend/server.js)
The Express app entry point. Sets up middleware (CORS, body parser, static file serving for uploads) and registers routes. Includes a background cron/scheduler to check and generate recurring expense items.

#### [NEW] [routes/auth.js](file:///d:/ExpenseTracker.v2/backend/routes/auth.js)
Endpoints for registration, login, profile edit, password reset, and account deletion.

#### [NEW] [routes/sync.js](file:///d:/ExpenseTracker.v2/backend/routes/sync.js)
The synchronization hub endpoint `POST /api/sync`. It processes batch updates from clients, performs conflict resolution (LWW), and queries the delta (changes since client's `lastSyncTime`) to return to the client.

---

### Component 2: Responsive Web Dashboard (`/web`)
A single-page web application featuring high-end visual aesthetics, glassmorphism, dark/light modes, interactive Chart.js charts, and offline-first IndexedDB capability.

#### [NEW] [index.html](file:///d:/ExpenseTracker.v2/web/index.html)
Main application frame. Features standard semantic HTML, placeholder structures for dynamic view rendering (Auth, Dashboard, Expense List, Add/Edit Expense, Budgets, Reports, Settings).

#### [NEW] [styles.css](file:///d:/ExpenseTracker.v2/web/styles.css)
Premium stylesheet featuring:
- Inter font integration.
- Dynamic theme variables (light/dark mode colors using customized HSL palettes).
- Glassmorphism effect styling (`backdrop-filter`) for cards and modals.
- Hover animations and interactive micro-transitions.
- Clean responsive layout matching mobile, tablet, and desktop viewports.

#### [NEW] [db.js](file:///d:/ExpenseTracker.v2/web/db.js)
An IndexedDB wrapper using raw web API to handle local offline storage of expenses, categories, budgets, and recurring rules. Maintains a sync queue of local changes made while offline.

#### [NEW] [api.js](file:///d:/ExpenseTracker.v2/web/api.js)
Handles server communication. Detects network status and automatically switches to cache/IndexedDB fallback when offline. Includes functions to upload receipt files and invoke the sync endpoint.

#### [NEW] [app.js](file:///d:/ExpenseTracker.v2/web/app.js)
Application logic, client-side routing, state management, chart instantiation (Chart.js via CDN), CSV/PDF export generation, and UI render loops.

#### [NEW] [sw.js](file:///d:/ExpenseTracker.v2/web/sw.js)
Service worker to cache assets, facilitating offline app load and operation.

---

### Component 3: Native Android App (`/android`)
A Jetpack Compose Kotlin application built on top of target SDK 34/35.

#### [NEW] [Android Project Files](file:///d:/ExpenseTracker.v2/android)
Initialize the project structure using `android create empty-activity`.
Components include:
- `data/local/`: Room Database entity models (ExpenseEntity, CategoryEntity, BudgetEntity, RecurringRuleEntity) and DAOs.
- `data/remote/`: Retrofit API interfaces, Request/Response sync data structures.
- `data/repository/`: SyncRepository coordinating Room DB updates, caching, and network fetch.
- `ui/screens/`: Jetpack Compose layouts for:
  - `LoginScreen.kt` & `RegisterScreen.kt`
  - `DashboardScreen.kt`: Summary statistics, Canvas-based custom spending charts.
  - `ExpenseListScreen.kt`: Expandable/collapsible entries with sorting & filtering.
  - `AddEditExpenseScreen.kt`: Detail inputs, camera/gallery receipt capture.
  - `BudgetScreen.kt`: Progress indicators for category and total budgets.
  - `ReportsScreen.kt`: Custom filter selects, summaries, and PDF/CSV share intents.
  - `SettingsScreen.kt`: Mode selectors, biometrics setup, account controls.
- `worker/SyncWorker.kt`: Periodic background task using WorkManager to auto-sync local data.

## Verification Plan

### Automated Tests
- Server integration verification via local test requests.
- Android layout and Compose verification using local layout inspection.
- Build checks for both Web App and Android App.

### Manual Verification
- **Auth Flow**: Register new user -> Logout -> Login -> Check persistent session.
- **Expense CRUD**: Add expense with notes, custom category, and receipt image -> Edit expense -> Filter/Sort -> Check database records.
- **Offline Sync (Web & Android)**:
  1. Turn off internet (disconnect mock/offline toggle or network tab).
  2. Create an expense offline. Check local list reflects changes.
  3. Turn on internet. Trigger sync. Check server database reflects changes.
  4. Edit same expense on web and android, verify newer timestamp resolves correctly.
- **Exporting**: Download CSV/PDF and verify formatting and contents.
