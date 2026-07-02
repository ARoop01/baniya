// AuraFinance Single Page Web Application Logic
import { openDB, putRecord, getRecord, getAllRecords, clearAllStores } from './db.js';
import { 
  initAuth, getAuthToken, getCurrentUser, isOnline, 
  registerUser, loginUser, logoutUser, resetPassword, 
  updateProfile, deleteAccount, uploadReceiptFile, syncWithServer 
} from './api.js';

// Global state
let activeView = 'dashboard';
let trendChartInstance = null;
let breakdownChartInstance = null;
let reportChartInstance = null;
let categoriesList = [];
let baseCurrencySymbol = '₹';

// Currency map
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥'
};

// Document elements
const DOM = {
  app: document.getElementById('app'),
  authContainer: document.getElementById('auth-container'),
  mainContainer: document.getElementById('main-container'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  resetForm: document.getElementById('reset-form'),
  toastContainer: document.getElementById('toast-container'),
  offlineBar: document.getElementById('offline-bar'),
  viewTitle: document.getElementById('view-title'),
  authTitle: document.getElementById('auth-title'),
  authSubtitle: document.getElementById('auth-subtitle'),
  goRegister: document.getElementById('go-register'),
  goForgot: document.getElementById('go-forgot'),
  goLogin: document.getElementById('go-login'),
  goLoginReset: document.getElementById('go-login-reset'),
  trendChart: document.getElementById('trendChart'),
  breakdownChart: document.getElementById('breakdownChart'),
  reportCategoryChart: document.getElementById('reportCategoryChart'),
  showLoginPassword: document.getElementById('show-login-password'),
  showRegisterPassword: document.getElementById('show-register-password'),
  budgetNewCategoryBtn: document.getElementById('budget-new-category-btn'),
  
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  logoutBtn: document.getElementById('logout-btn'),
  syncNowBtn: document.getElementById('sync-now-btn'),
  quickAddBtn: document.getElementById('quick-add-btn'),
  
  // User profile
  userAvatarInitial: document.getElementById('user-avatar-initial'),
  userDisplayName: document.getElementById('user-display-name'),
  userDisplayEmail: document.getElementById('user-display-email'),
  
  // Views
  viewDashboard: document.getElementById('view-dashboard'),
  viewExpenses: document.getElementById('view-expenses'),
  viewBudgets: document.getElementById('view-budgets'),
  viewReports: document.getElementById('view-reports'),
  viewSettings: document.getElementById('view-settings'),
  viewDebts: document.getElementById('view-debts'),
  
  // Dashboard Stat elements
  dashSpent: document.getElementById('dash-spent'),
  dashSpentDiff: document.getElementById('dash-spent-diff'),
  dashBudget: document.getElementById('dash-budget'),
  dashBudgetProgress: document.getElementById('dash-budget-progress'),
  dashBudgetText: document.getElementById('dash-budget-text'),
  dashTopCat: document.getElementById('dash-top-cat'),
  dashTopCatSpent: document.getElementById('dash-top-cat-spent'),
  dashRecentExpensesBody: document.getElementById('dash-recent-expenses-body'),
  dashInsightsList: document.getElementById('dashboard-insights'),
  dashViewAllExpenses: document.getElementById('dash-view-all-expenses'),

  // Expenses filter/list elements
  expenseSearch: document.getElementById('expense-search'),
  expenseFilterCategory: document.getElementById('expense-filter-category'),
  expenseFilterMethod: document.getElementById('expense-filter-method'),
  expenseFilterStart: document.getElementById('expense-filter-start'),
  expenseFilterEnd: document.getElementById('expense-filter-end'),
  expenseSort: document.getElementById('expense-sort'),
  clearFiltersBtn: document.getElementById('clear-filters-btn'),
  expenseListBody: document.getElementById('expense-list-body'),
  expenseListEmpty: document.getElementById('expense-list-empty'),
  
  // Budgets elements
  budgetForm: document.getElementById('budget-form'),
  budgetCategory: document.getElementById('budget-category'),
  budgetAmount: document.getElementById('budget-amount'),
  budgetProgressList: document.getElementById('budget-progress-list'),
  
  // Reports elements
  reportStart: document.getElementById('report-start'),
  reportEnd: document.getElementById('report-end'),
  reportFormat: document.getElementById('report-format'),
  generateReportBtn: document.getElementById('generate-report-btn'),
  repTotalSpent: document.getElementById('rep-total-spent'),
  repEntryCount: document.getElementById('rep-entry-count'),
  repDailyAvg: document.getElementById('rep-daily-avg'),
  
  // Settings elements
  profileForm: document.getElementById('profile-form'),
  profileName: document.getElementById('profile-name'),
  profileCurrency: document.getElementById('profile-currency'),
  settingsCategoriesBody: document.getElementById('settings-categories-body'),
  addCatBtn: document.getElementById('add-cat-btn'),
  darkModeToggle: document.getElementById('dark-mode-toggle'),
  backupExportBtn: document.getElementById('backup-export-btn'),
  backupImportBtn: document.getElementById('backup-import-btn'),
  backupFileInput: document.getElementById('backup-file-input'),
  deleteAccountBtn: document.getElementById('delete-account-btn'),
  
  // Modals
  expenseModal: document.getElementById('expense-modal'),
  expenseModalForm: document.getElementById('expense-modal-form'),
  expenseModalTitle: document.getElementById('expense-modal-title'),
  expenseId: document.getElementById('expense-id'),
  expenseRecurringId: document.getElementById('expense-recurring-id'),
  expenseAmount: document.getElementById('expense-amount'),
  expenseCategory: document.getElementById('expense-category'),
  expenseCurrency: document.getElementById('expense-currency'),
  expenseDate: document.getElementById('expense-date'),
  expenseMethod: document.getElementById('expense-method'),
  expenseNotes: document.getElementById('expense-notes'),
  expenseReceipt: document.getElementById('expense-receipt'),
  receiptPreviewWrap: document.getElementById('receipt-preview-wrap'),
  receiptPreview: document.getElementById('receipt-preview'),
  removeReceiptBtn: document.getElementById('remove-receipt-btn'),
  expenseIsRecurring: document.getElementById('expense-is-recurring'),
  recurringOptions: document.getElementById('recurring-options'),
  expenseRecurringFrequency: document.getElementById('expense-recurring-frequency'),
  expenseSaveBtn: document.getElementById('expense-save-btn'),
  
  categoryModal: document.getElementById('category-modal'),
  categoryModalForm: document.getElementById('category-modal-form'),
  categoryModalTitle: document.getElementById('category-modal-title'),
  categoryId: document.getElementById('category-id'),
  categoryName: document.getElementById('category-name'),
  categoryIcon: document.getElementById('category-icon'),
  categoryColor: document.getElementById('category-color'),
  
  // Debts
  debtsTotalLent: document.getElementById('debts-total-lent'),
  debtsTotalBorrowed: document.getElementById('debts-total-borrowed'),
  debtFilterType: document.getElementById('debt-filter-type'),
  debtFilterStatus: document.getElementById('debt-filter-status'),
  addDebtBtn: document.getElementById('add-debt-btn'),
  debtList: document.getElementById('debt-list'),
  debtListEmpty: document.getElementById('debt-list-empty'),
  pendingDebtsTitle: document.getElementById('pending-debts-title'),
  budgetPendingRepaymentsList: document.getElementById('budget-pending-repayments-list'),
  debtModal: document.getElementById('debt-modal'),
  debtModalForm: document.getElementById('debt-modal-form'),
  debtModalTitle: document.getElementById('debt-modal-title'),
  debtId: document.getElementById('debt-id'),
  debtPerson: document.getElementById('debt-person'),
  debtType: document.getElementById('debt-type'),
  debtAmount: document.getElementById('debt-amount'),
  debtRepaymentType: document.getElementById('debt-repayment-type'),
  debtMonthlyTermsRow: document.getElementById('debt-monthly-terms-row'),
  debtMonths: document.getElementById('debt-months'),
  debtStartDate: document.getElementById('debt-start-date'),
  debtDeadlineDate: document.getElementById('debt-deadline-date'),
  debtNotes: document.getElementById('debt-notes'),
  debtSaveBtn: document.getElementById('debt-save-btn'),
};

// ================= TOAST NOTIFICATION SERVICE =================
export const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'danger' ? '✖' : 'ℹ'}</span> ${message}`;
  
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Generate UUID for offline creation
const generateUUID = () => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

// ================= INLINE ROUTING =================
const showView = (viewName) => {
  activeView = viewName;
  
  // Update Navigation menu state
  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle View Panels
  DOM.viewDashboard.classList.add('hidden');
  DOM.viewExpenses.classList.add('hidden');
  DOM.viewBudgets.classList.add('hidden');
  DOM.viewReports.classList.add('hidden');
  DOM.viewSettings.classList.add('hidden');
  DOM.viewDebts.classList.add('hidden');

  DOM.viewTitle.textContent = viewName === 'debts' ? 'Lend & Borrow' : (viewName.charAt(0).toUpperCase() + viewName.slice(1));

  if (viewName === 'dashboard') {
    DOM.viewDashboard.classList.remove('hidden');
    loadDashboardView();
  } else if (viewName === 'expenses') {
    DOM.viewExpenses.classList.remove('hidden');
    loadExpensesView();
  } else if (viewName === 'budgets') {
    DOM.viewBudgets.classList.remove('hidden');
    loadBudgetsView();
  } else if (viewName === 'reports') {
    DOM.viewReports.classList.remove('hidden');
    loadReportsView();
  } else if (viewName === 'settings') {
    DOM.viewSettings.classList.remove('hidden');
    loadSettingsView();
  } else if (viewName === 'debts') {
    DOM.viewDebts.classList.remove('hidden');
    loadDebtsView();
  }
};

// ================= OFFLINE STATUS SENSING =================
const updateOnlineStatus = () => {
  if (isOnline()) {
    DOM.offlineBar.classList.add('hidden');
    showToast('Network connected. Ready to sync!', 'success');
    triggerSync();
  } else {
    DOM.offlineBar.classList.remove('hidden');
    showToast('Network disconnected. Operating offline mode.', 'warning');
  }
};

const triggerSync = async () => {
  if (!getAuthToken()) return;
  DOM.syncNowBtn.disabled = true;
  DOM.syncNowBtn.textContent = '🔄 Syncing...';
  
  const result = await syncWithServer();
  
  DOM.syncNowBtn.disabled = false;
  DOM.syncNowBtn.textContent = '🔄 Sync Now';

  if (result.success) {
    showToast('Data synchronized successfully with server!', 'success');
    refreshActiveView();
  } else if (result.reason !== 'offline_or_unauthenticated') {
    showToast(`Sync failed: ${result.error || 'Server error'}`, 'danger');
  }
};

const refreshActiveView = () => {
  showView(activeView);
};

// ================= DATA FORMATTERS =================
const formatMoney = (amount, currencyCode = null) => {
  const user = getCurrentUser();
  const pref = currencyCode || (user ? user.currencyPreference : 'INR');
  const symbol = CURRENCY_SYMBOLS[pref] || '₹';
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
};

const getCategoryColor = (catId) => {
  const cat = categoriesList.find(c => c.id === catId);
  return cat ? cat.color : '#6B7280';
};

const getCategoryIcon = (catId) => {
  const cat = categoriesList.find(c => c.id === catId);
  return cat ? cat.icon : '🏷️';
};

const getCategoryName = (catId) => {
  const cat = categoriesList.find(c => c.id === catId);
  return cat ? cat.name : 'Other';
};

// Load list of categories to local memory
const loadCategories = async () => {
  categoriesList = await getAllRecords('categories');
  
  // Populate default fallback categories if IndexedDB hasn't seeded yet
  if (categoriesList.length === 0) {
    const defaults = [
      { id: 'def-food', name: 'Food', icon: '🍔', color: '#EF4444', is_default: 1 },
      { id: 'def-transport', name: 'Transport', icon: '🚗', color: '#3B82F6', is_default: 1 },
      { id: 'def-ent', name: 'Entertainment', icon: '🎬', color: '#10B981', is_default: 1 },
      { id: 'def-bills', name: 'Bills', icon: '🔌', color: '#F59E0B', is_default: 1 },
      { id: 'def-shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899', is_default: 1 },
      { id: 'def-health', name: 'Health', icon: '🏥', color: '#8B5CF6', is_default: 1 },
      { id: 'def-other', name: 'Other', icon: '🏷️', color: '#6B7280', is_default: 1 }
    ];
    for (const d of defaults) {
      await putRecord('categories', d);
    }
    categoriesList = defaults;
  }

  // Populate Select drop downs
  const populateSelects = () => {
    // 1. Expense log select
    DOM.expenseCategory.innerHTML = '';
    // 2. Budget setup select
    DOM.budgetCategory.innerHTML = '<option value="OVERALL">Overall Monthly Budget</option>';
    // 3. Filter category select
    DOM.expenseFilterCategory.innerHTML = '<option value="">All Categories</option>';

    categoriesList.filter(c => !c.is_deleted).forEach(cat => {
      const optionHtml = `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
      DOM.expenseCategory.insertAdjacentHTML('beforeend', optionHtml);
      DOM.budgetCategory.insertAdjacentHTML('beforeend', optionHtml);
      DOM.expenseFilterCategory.insertAdjacentHTML('beforeend', optionHtml);
    });
  };
  populateSelects();
};

// ================= VIEW 1: DASHBOARD VIEW LOAD =================
const loadDashboardView = async () => {
  await loadCategories();
  const user = getCurrentUser();
  baseCurrencySymbol = CURRENCY_SYMBOLS[user ? user.currencyPreference : 'INR'] || '₹';

  const expenses = (await getAllRecords('expenses')).filter(e => !e.is_deleted);
  const budgets = (await getAllRecords('budgets')).filter(b => !b.is_deleted);

  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);

  // Filter current month expenses
  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
  const prevMonthExpenses = expenses.filter(e => e.date.startsWith(prevMonthStr));

  // Current Month spent
  const thisMonthSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevMonthSpent = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  DOM.dashSpent.textContent = formatMoney(thisMonthSpent);
  
  // Comparison
  if (prevMonthSpent > 0) {
    const pct = ((thisMonthSpent - prevMonthSpent) / prevMonthSpent) * 100;
    const isMore = pct > 0;
    DOM.dashSpentDiff.innerHTML = `<span style="color: ${isMore ? 'var(--danger)' : 'var(--success)'}">
      ${isMore ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%
    </span> vs last month (${formatMoney(prevMonthSpent)})`;
  } else {
    DOM.dashSpentDiff.textContent = 'No previous month data';
  }

  // Budget Status
  const overallBudget = budgets.find(b => b.month === currentMonthStr && !b.category_id);
  if (overallBudget) {
    const limit = overallBudget.amount;
    const remaining = Math.max(0, limit - thisMonthSpent);
    const pct = Math.min(100, (thisMonthSpent / limit) * 100);

    DOM.dashBudget.textContent = formatMoney(remaining);
    DOM.dashBudgetProgress.style.width = `${pct}%`;
    
    // Progress color
    if (pct >= 100) {
      DOM.dashBudgetProgress.style.backgroundColor = 'var(--danger)';
      DOM.dashBudgetText.innerHTML = `<span style="color: var(--danger)">Over budget! (${pct.toFixed(0)}% consumed)</span>`;
    } else if (pct >= 80) {
      DOM.dashBudgetProgress.style.backgroundColor = 'var(--warning)';
      DOM.dashBudgetText.innerHTML = `<span style="color: var(--warning)">Approaching limit (${pct.toFixed(0)}% consumed)</span>`;
    } else {
      DOM.dashBudgetProgress.style.backgroundColor = 'var(--success)';
      DOM.dashBudgetText.textContent = `${pct.toFixed(0)}% consumed of ${formatMoney(limit)}`;
    }
  } else {
    DOM.dashBudget.textContent = '--';
    DOM.dashBudgetProgress.style.width = '0%';
    DOM.dashBudgetText.textContent = 'No overall budget set';
  }

  // Top spending category
  const catSpend = {};
  thisMonthExpenses.forEach(e => {
    catSpend[e.category_id] = (catSpend[e.category_id] || 0) + e.amount;
  });

  let topCatId = null;
  let topCatAmt = 0;
  for (const [id, amt] of Object.entries(catSpend)) {
    if (amt > topCatAmt) {
      topCatAmt = amt;
      topCatId = id;
    }
  }

  if (topCatId) {
    DOM.dashTopCat.textContent = `${getCategoryIcon(topCatId)} ${getCategoryName(topCatId)}`;
    DOM.dashTopCatSpent.textContent = `${formatMoney(topCatAmt)} spent this month`;
  } else {
    DOM.dashTopCat.textContent = 'None';
    DOM.dashTopCatSpent.textContent = '$0.00 spent this month';
  }

  // Render Recent Expenses (Newest first, limit 5)
  const sortedExpenses = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date));
  const recent = sortedExpenses.slice(0, 5);
  
  DOM.dashRecentExpensesBody.innerHTML = '';
  if (recent.length === 0) {
    DOM.dashRecentExpensesBody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center">No recent expenses.</td></tr>';
  } else {
    recent.forEach(exp => {
      const row = `<tr class="table-row-hover">
        <td>
          <span class="category-badge" style="background-color: ${getCategoryColor(exp.category_id)}20; color: ${getCategoryColor(exp.category_id)}">
            ${getCategoryIcon(exp.category_id)} ${getCategoryName(exp.category_id)}
          </span>
        </td>
        <td>${exp.date}</td>
        <td><span class="payment-badge">${exp.payment_method}</span></td>
        <td>${exp.notes || ''}</td>
        <td class="amount-val" style="color: var(--danger)">-${formatMoney(exp.amount, exp.currency)}</td>
      </tr>`;
      DOM.dashRecentExpensesBody.insertAdjacentHTML('beforeend', row);
    });
  }

  // Insights List
  DOM.dashInsightsList.innerHTML = '';
  const insights = [];

  if (thisMonthSpent > 0) {
    // 1. Highlight top category
    if (topCatId) {
      const share = (topCatAmt / thisMonthSpent) * 100;
      insights.push({
        icon: '📊',
        text: `Your top spending category is <strong>${getCategoryName(topCatId)}</strong>, making up <strong>${share.toFixed(0)}%</strong> of your total monthly layout.`
      });
    }

    // 2. Budget Warning
    if (overallBudget && (thisMonthSpent > overallBudget.amount)) {
      insights.push({
        icon: '🚨',
        text: `You have exceeded your overall monthly budget by <strong>${formatMoney(thisMonthSpent - overallBudget.amount)}</strong>. Consider pausing non-essential purchases.`
      });
    } else if (overallBudget && (thisMonthSpent >= overallBudget.amount * 0.8)) {
      insights.push({
        icon: '⚠️',
        text: `Warning: You have consumed <strong>${((thisMonthSpent / overallBudget.amount) * 100).toFixed(0)}%</strong> of your monthly budget limit.`
      });
    }

    // 3. MoM change suggestions
    if (prevMonthSpent > 0) {
      const diff = thisMonthSpent - prevMonthSpent;
      const pct = (diff / prevMonthSpent) * 100;
      if (pct > 15) {
        insights.push({
          icon: '📉',
          text: `You spent <strong>${Math.abs(pct).toFixed(0)}% more</strong> than last month. Look at your recent transactions to locate leakages.`
        });
      } else if (pct < -10) {
        insights.push({
          icon: '🎉',
          text: `Awesome job! You spent <strong>${Math.abs(pct).toFixed(0)}% less</strong> than last month. Keep up the disciplined spending habits!`
        });
      }
    }
  }

  if (insights.length === 0) {
    DOM.dashInsightsList.innerHTML = `
      <div class="insight-item">
        <span class="insight-icon">💡</span>
        <span class="insight-text">Add your daily expenses regularly to generate personalized AI finance insights.</span>
      </div>`;
  } else {
    insights.forEach(ins => {
      DOM.dashInsightsList.insertAdjacentHTML('beforeend', `
        <div class="insight-item">
          <span class="insight-icon">${ins.icon}</span>
          <span class="insight-text">${ins.text}</span>
        </div>`);
    });
  }

  // Draw Charts
  drawDashboardCharts(thisMonthExpenses);
};

const drawDashboardCharts = (currentMonthExpenses) => {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded. Skipping dashboard chart rendering.');
    return;
  }
  // 1. Category Breakdown Doughnut Chart
  const categoriesMap = {};
  currentMonthExpenses.forEach(e => {
    const name = getCategoryName(e.category_id);
    categoriesMap[name] = (categoriesMap[name] || 0) + e.amount;
  });

  const breakLabels = Object.keys(categoriesMap);
  const breakData = Object.values(categoriesMap);
  const breakColors = breakLabels.map(label => {
    const cat = categoriesList.find(c => c.name === label);
    return cat ? cat.color : '#6B7280';
  });

  if (breakdownChartInstance) breakdownChartInstance.destroy();
  const breakdownCtx = DOM.breakdownChart.getContext('2d');
  
  if (breakLabels.length === 0) {
    breakLabels.push('No data');
    breakData.push(1);
    breakColors.push('rgba(255,255,255,0.05)');
  }

  breakdownChartInstance = new Chart(breakdownCtx, {
    type: 'doughnut',
    data: {
      labels: breakLabels,
      datasets: [{
        data: breakData,
        backgroundColor: breakColors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: 'var(--text-secondary)', font: { family: 'Inter', size: 10 } }
        }
      },
      cutout: '65%'
    }
  });

  // 2. Spending Trend Over Time (Daily line chart for past 30 days)
  const past30Days = [];
  const dailySpend = {};
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    past30Days.push(dateStr);
    dailySpend[dateStr] = 0;
  }

  // Get all expenses from past 30 days
  const allExpenses = categoriesList.length > 0 ? (trendChartInstance ? [] : []) : []; // dummy check
  const thirtyDaysAgoStr = past30Days[0];
  
  // We need to fetch all records
  getAllRecords('expenses').then(allExps => {
    const validExps = allExps.filter(e => !e.is_deleted && e.date >= thirtyDaysAgoStr && e.date <= past30Days[29]);
    validExps.forEach(e => {
      if (dailySpend[e.date] !== undefined) {
        dailySpend[e.date] += e.amount;
      }
    });

    const trendLabels = past30Days.map(date => {
      const parts = date.split('-');
      return `${parts[1]}/${parts[2]}`; // MM/DD
    });
    const trendData = past30Days.map(date => dailySpend[date]);

    if (trendChartInstance) trendChartInstance.destroy();
    const trendCtx = DOM.trendChart.getContext('2d');

    trendChartInstance = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Daily Spending',
          data: trendData,
          borderColor: 'var(--primary)',
          backgroundColor: 'var(--primary-soft)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'var(--text-muted)', font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: 'var(--text-muted)', font: { family: 'Inter', size: 10 } }
          }
        }
      }
    });
  });
};

// ================= VIEW 2: EXPENSES VIEW LOAD =================
const loadExpensesView = async () => {
  await loadCategories();
  const expenses = (await getAllRecords('expenses')).filter(e => !e.is_deleted);

  const query = DOM.expenseSearch.value.toLowerCase().trim();
  const catFilter = DOM.expenseFilterCategory.value;
  const methodFilter = DOM.expenseFilterMethod.value;
  const startFilter = DOM.expenseFilterStart.value;
  const endFilter = DOM.expenseFilterEnd.value;
  const sortBy = DOM.expenseSort.value;

  // Filter
  let filtered = expenses.filter(exp => {
    // Search query
    if (query && !exp.notes?.toLowerCase().includes(query)) return false;
    // Category
    if (catFilter && exp.category_id !== catFilter) return false;
    // Method
    if (methodFilter && exp.payment_method !== methodFilter) return false;
    // Start date
    if (startFilter && exp.date < startFilter) return false;
    // End date
    if (endFilter && exp.date > endFilter) return false;
    
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    if (sortBy === 'category-asc') {
      const nameA = getCategoryName(a.category_id);
      const nameB = getCategoryName(b.category_id);
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  // Render UI list
  DOM.expenseListBody.innerHTML = '';
  
  if (filtered.length === 0) {
    DOM.expenseListEmpty.classList.remove('hidden');
  } else {
    DOM.expenseListEmpty.classList.add('hidden');
    filtered.forEach(exp => {
      const receiptCell = exp.receipt_url 
        ? `<img class="receipt-thumbnail" src="${exp.receipt_url}" alt="Receipt" onclick="window.open('${exp.receipt_url}')">`
        : '<span class="no-receipt">--</span>';

      const row = `<tr class="table-row-hover">
        <td style="font-weight: 500">${exp.date}</td>
        <td>
          <span class="category-badge" style="background-color: ${getCategoryColor(exp.category_id)}20; color: ${getCategoryColor(exp.category_id)}">
            ${getCategoryIcon(exp.category_id)} ${getCategoryName(exp.category_id)}
          </span>
        </td>
        <td><span class="payment-badge">${exp.payment_method}</span></td>
        <td>${exp.notes || ''}</td>
        <td>${receiptCell}</td>
        <td class="amount-val" style="color: var(--danger)">-${formatMoney(exp.amount, exp.currency)}</td>
        <td class="actions-cell">
          <button class="action-btn edit-exp-btn" data-id="${exp.id}" title="Edit">✏️</button>
          <button class="action-btn delete-exp-btn" data-id="${exp.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
      
      DOM.expenseListBody.insertAdjacentHTML('beforeend', row);
    });

    // Attach listeners to dynamically generated Edit & Delete buttons
    document.querySelectorAll('.edit-exp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openExpenseModal(id);
      });
    });

    document.querySelectorAll('.delete-exp-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this expense?')) {
          await deleteExpenseLocal(id);
        }
      });
    });
  }
};

const deleteExpenseLocal = async (id) => {
  const exp = await getRecord('expenses', id);
  if (exp) {
    exp.is_deleted = 1;
    exp.updated_at = new Date().toISOString();
    await putRecord('expenses', exp);
    showToast('Expense deleted locally', 'success');
    loadExpensesView();
    triggerSync();
  }
};

// ================= VIEW 3: BUDGETS VIEW LOAD =================
const loadBudgetsView = async () => {
  await loadCategories();
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  const budgets = (await getAllRecords('budgets')).filter(b => !b.is_deleted && b.month === currentMonthStr);
  const expenses = (await getAllRecords('expenses')).filter(e => !e.is_deleted && e.date.startsWith(currentMonthStr));

  // Compute category spending
  const catSpend = {};
  expenses.forEach(e => {
    catSpend[e.category_id] = (catSpend[e.category_id] || 0) + e.amount;
  });
  const totalMonthSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  DOM.budgetProgressList.innerHTML = '';

  // Render Overall Budget if exists
  const overall = budgets.find(b => !b.category_id);
  if (overall) {
    const spent = totalMonthSpent;
    const limit = overall.amount;
    const pct = Math.min(100, (spent / limit) * 100);
    const progressClass = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success';

    const card = `
      <div class="budget-progress-item">
        <div class="budget-progress-header">
          <strong>Overall Monthly Budget</strong>
          <strong>${pct.toFixed(0)}% Used</strong>
        </div>
        <div class="budget-progress-bar-wrap">
          <div class="budget-progress-fill ${progressClass}" style="width: ${pct}%"></div>
        </div>
        <div class="budget-progress-details">
          <span>Spent: ${formatMoney(spent)}</span>
          <span>Limit: ${formatMoney(limit)}</span>
        </div>
      </div>`;
    DOM.budgetProgressList.insertAdjacentHTML('beforeend', card);
  }

  // Render Category Budgets
  const categoryBudgets = budgets.filter(b => b.category_id);
  if (categoryBudgets.length === 0 && !overall) {
    DOM.budgetProgressList.innerHTML = '<div class="text-muted" style="text-align:center; padding: 2rem">No active budgets for this month. Set one using the form on the left!</div>';
  } else {
    categoryBudgets.forEach(bud => {
      const spent = catSpend[bud.category_id] || 0;
      const limit = bud.amount;
      const pct = Math.min(100, (spent / limit) * 100);
      const progressClass = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success';

      const card = `
        <div class="budget-progress-item">
          <div class="budget-progress-header">
            <strong>${getCategoryIcon(bud.category_id)} ${getCategoryName(bud.category_id)}</strong>
            <strong>${pct.toFixed(0)}% Used</strong>
          </div>
          <div class="budget-progress-bar-wrap">
            <div class="budget-progress-fill ${progressClass}" style="width: ${pct}%"></div>
          </div>
          <div class="budget-progress-details">
            <span>Spent: ${formatMoney(spent)}</span>
            <span>Limit: ${formatMoney(limit)}</span>
          </div>
        </div>`;
      DOM.budgetProgressList.insertAdjacentHTML('beforeend', card);
    });
  }

  // Render Pending Repayments under Budgets
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const debts = (await getAllRecords('debts')).filter(d => !d.is_deleted && d.status === 'active' && d.type === 'borrowed');
  
  const pendingRepayments = debts.filter(d => {
    if (d.repayment_type === 'monthly') {
      return d.last_payment_month !== currentMonth;
    } else {
      return d.deadline_date.slice(0, 7) <= currentMonth;
    }
  });

  DOM.budgetPendingRepaymentsList.innerHTML = '';
  if (pendingRepayments.length === 0) {
    DOM.pendingDebtsTitle.classList.add('hidden');
    DOM.budgetPendingRepaymentsList.classList.add('hidden');
  } else {
    DOM.pendingDebtsTitle.classList.remove('hidden');
    DOM.budgetPendingRepaymentsList.classList.remove('hidden');
    
    pendingRepayments.forEach(debt => {
      const isMonthly = debt.repayment_type === 'monthly';
      const owedThisMonth = isMonthly ? debt.monthly_amount : debt.remaining_amount;
      
      const itemHtml = `
        <div class="budget-progress-item" style="border-left: 3px solid var(--danger); padding-left: 0.75rem;">
          <div class="budget-progress-header">
            <strong>Owed to ${debt.person}</strong>
            <strong style="color: var(--danger); font-size: 1.1rem;">${formatMoney(owedThisMonth)}</strong>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; display: flex; justify-content: space-between;">
            <span>Deadline: ${debt.deadline_date} (${isMonthly ? 'Monthly' : 'Lumpsum'})</span>
            <a href="#" class="quick-repay-budget text-link" data-id="${debt.id}" style="font-weight:700;">[Pay Now]</a>
          </div>
        </div>
      `;
      DOM.budgetPendingRepaymentsList.insertAdjacentHTML('beforeend', itemHtml);
    });

    document.querySelectorAll('.quick-repay-budget').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = e.target.getAttribute('data-id');
        await handleDebtRepayment(id);
      });
    });
  }
};

// Save/Update budget Form Handler
DOM.budgetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const categoryId = DOM.budgetCategory.value;
  const amount = parseFloat(DOM.budgetAmount.value);
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  if (isNaN(amount) || amount <= 0) return;

  const keyCatId = categoryId === 'OVERALL' ? null : categoryId;
  const existingBudgets = await getAllRecords('budgets');
  
  // Find match
  const existing = existingBudgets.find(b => b.month === currentMonthStr && b.category_id === keyCatId && !b.is_deleted);
  
  const budgetId = existing ? existing.id : generateUUID();

  const newBudget = {
    id: budgetId,
    category_id: keyCatId,
    amount,
    month: currentMonthStr,
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  await putRecord('budgets', newBudget);
  showToast('Budget saved successfully', 'success');
  DOM.budgetAmount.value = '';
  loadBudgetsView();
  triggerSync();
});

// ================= VIEW 4: REPORTS VIEW LOAD =================
const loadReportsView = async () => {
  // Default date ranges to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  if (!DOM.reportStart.value) DOM.reportStart.value = firstDay;
  if (!DOM.reportEnd.value) DOM.reportEnd.value = lastDay;

  generateReportData();
};

const generateReportData = async () => {
  const start = DOM.reportStart.value;
  const end = DOM.reportEnd.value;

  if (!start || !end) return;

  const expenses = (await getAllRecords('expenses')).filter(e => !e.is_deleted && e.date >= start && e.date <= end);

  // Compute Statistics
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;
  
  // Number of days in range
  const daysDiff = Math.max(1, Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1);
  const avg = total / daysDiff;

  DOM.repTotalSpent.textContent = formatMoney(total);
  DOM.repEntryCount.textContent = count;
  DOM.repDailyAvg.textContent = formatMoney(avg);

  // Draw Category Share Chart
  const categoriesMap = {};
  expenses.forEach(e => {
    const name = getCategoryName(e.category_id);
    categoriesMap[name] = (categoriesMap[name] || 0) + e.amount;
  });

  const repLabels = Object.keys(categoriesMap);
  const repData = Object.values(categoriesMap);
  const repColors = repLabels.map(label => {
    const cat = categoriesList.find(c => c.name === label);
    return cat ? cat.color : '#6B7280';
  });

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded. Skipping report chart rendering.');
    return;
  }

  if (reportChartInstance) reportChartInstance.destroy();
  const reportCtx = DOM.reportCategoryChart.getContext('2d');

  if (repLabels.length === 0) {
    repLabels.push('No data');
    repData.push(1);
    repColors.push('rgba(255,255,255,0.05)');
  }

  reportChartInstance = new Chart(reportCtx, {
    type: 'pie',
    data: {
      labels: repLabels,
      datasets: [{
        data: repData,
        backgroundColor: repColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'var(--text-secondary)', font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
};

DOM.generateReportBtn.addEventListener('click', async () => {
  const format = DOM.reportFormat.value;
  const start = DOM.reportStart.value;
  const end = DOM.reportEnd.value;

  if (format === 'csv') {
    await exportCSV(start, end);
  } else {
    exportPDF(start, end);
  }
});

// CSV Export Utility
const exportCSV = async (start, end) => {
  const expenses = (await getAllRecords('expenses')).filter(e => !e.is_deleted && e.date >= start && e.date <= end);
  
  if (expenses.length === 0) {
    showToast('No transaction data found in specified date range', 'warning');
    return;
  }

  // Construct CSV Header & Content
  let csv = 'Date,Category,Payment Method,Notes/Description,Currency,Amount\r\n';
  expenses.forEach(e => {
    const catName = getCategoryName(e.category_id);
    const notes = (e.notes || '').replace(/"/g, '""');
    csv += `"${e.date}","${catName}","${e.payment_method}","${notes}","${e.currency || 'USD'}",${e.amount}\r\n`;
  });

  // Download Blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AuraFinance_Report_${start}_to_${end}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Print Export Utility
const exportPDF = (start, end) => {
  // Launch print style layout for current page, or open formatted print window
  const printWindow = window.open('', '_blank');
  
  getAllRecords('expenses').then(exps => {
    const filtered = exps.filter(e => !e.is_deleted && e.date >= start && e.date <= end);
    const total = filtered.reduce((s, e) => s + e.amount, 0);

    let rowsHtml = '';
    filtered.forEach(e => {
      rowsHtml += `<tr>
        <td>${e.date}</td>
        <td>${getCategoryIcon(e.category_id)} ${getCategoryName(e.category_id)}</td>
        <td>${e.payment_method}</td>
        <td>${e.notes || ''}</td>
        <td style="text-align: right">${formatMoney(e.amount, e.currency)}</td>
      </tr>`;
    });

    const docHtml = `
      <html>
      <head>
        <title>AuraFinance Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 20px; }
          h1 { margin-bottom: 5px; font-weight: bold; }
          p { margin-top: 0; color: #666; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.9em; }
          th { background: #f9f9f9; color: #555; }
          .summary-card { background: #f5f5f7; border-radius: 8px; padding: 15px; margin-top: 20px; display: flex; justify-content: space-between; }
          .summary-item { display: flex; flex-direction: column; }
          .val { font-size: 1.5em; font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>AuraFinance Report</h1>
        <p>Period: ${start} to ${end}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Method</th>
              <th>Notes / Description</th>
              <th style="text-align: right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center">No entries found</td></tr>'}
          </tbody>
        </table>
        <div class="summary-card">
          <div class="summary-item">
            <span>Total Spending</span>
            <span class="val">${formatMoney(total)}</span>
          </div>
          <div class="summary-item">
            <span>Entries Count</span>
            <span class="val">${filtered.length}</span>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>`;
      
    printWindow.document.write(docHtml);
    printWindow.document.close();
  });
};

// ================= VIEW 5: SETTINGS VIEW LOAD =================
const loadSettingsView = async () => {
  const user = getCurrentUser();
  if (user) {
    DOM.profileName.value = user.name;
    DOM.profileCurrency.value = user.currencyPreference;
  }

  await loadCategories();

  // Render category settings list
  DOM.settingsCategoriesBody.innerHTML = '';
  categoriesList.forEach(cat => {
    const typeLabel = cat.is_default ? 'System Default' : 'User Custom';
    const deleteBtn = cat.is_default 
      ? '<span class="text-muted">--</span>' 
      : `<button class="action-btn delete-cat-btn" data-id="${cat.id}" title="Delete Category">🗑️</button>`;

    const row = `<tr class="table-row-hover">
      <td><span class="amount-val">${cat.name}</span></td>
      <td>
        <span class="category-badge" style="background-color: ${cat.color}20; color: ${cat.color}">
          ${cat.icon} ${cat.color}
        </span>
      </td>
      <td><span class="text-muted" style="font-size:0.85em">${typeLabel}</span></td>
      <td>${deleteBtn}</td>
    </tr>`;

    DOM.settingsCategoriesBody.insertAdjacentHTML('beforeend', row);
  });

  // Attach delete category listeners
  document.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this custom category? Associated expenses might show as "Other".')) {
        await deleteCategoryLocal(id);
      }
    });
  });
};

// Delete Category locally
const deleteCategoryLocal = async (id) => {
  const cat = await getRecord('categories', id);
  if (cat) {
    cat.is_deleted = 1;
    cat.updated_at = new Date().toISOString();
    await putRecord('categories', cat);
    showToast('Category deleted successfully', 'success');
    loadSettingsView();
    triggerSync();
  }
};

// Profile Update submit
DOM.profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = DOM.profileName.value;
  const currencyPreference = DOM.profileCurrency.value;

  try {
    if (isOnline()) {
      await updateProfile(name, currencyPreference);
    } else {
      // Offline profile saving in metadata
      const user = getCurrentUser();
      user.name = name;
      user.currencyPreference = currencyPreference;
      await putRecord('metadata', { key: 'user', value: user });
      showToast('Profile preferences saved locally (offline)', 'success');
    }
    showToast('Profile settings updated!', 'success');
    loadSettingsView();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// Create custom category Modal opener
DOM.addCatBtn.addEventListener('click', () => {
  DOM.categoryId.value = '';
  DOM.categoryName.value = '';
  DOM.categoryIcon.value = '';
  DOM.categoryModal.classList.remove('hidden');
});

DOM.categoryModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = DOM.categoryName.value.trim();
  const icon = DOM.categoryIcon.value.trim();
  const color = DOM.categoryColor.value;

  if (!name || !icon) return;

  const newCat = {
    id: generateUUID(),
    user_id: getCurrentUser()?.id,
    name,
    icon,
    color,
    is_default: 0,
    is_deleted: 0,
    updated_at: new Date().toISOString()
  };

  await putRecord('categories', newCat);
  showToast('Custom category created!', 'success');
  DOM.categoryModal.classList.add('hidden');
  if (activeView === 'settings') {
    loadSettingsView();
  } else {
    refreshActiveView();
  }
  triggerSync();
});

// JSON Backup Export
DOM.backupExportBtn.addEventListener('click', async () => {
  const expenses = await getAllRecords('expenses');
  const categories = await getAllRecords('categories');
  const budgets = await getAllRecords('budgets');
  const recurringRules = await getAllRecords('recurring_rules');

  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    expenses,
    categories: categories.filter(c => !c.is_default), // only custom
    budgets,
    recurringRules
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AuraFinance_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  link.click();
  showToast('Local JSON Backup file generated!', 'success');
});

// JSON Backup Import
DOM.backupImportBtn.addEventListener('click', () => {
  DOM.backupFileInput.click();
});

DOM.backupFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const e of data.expenses) await putRecord('expenses', e);
        for (const c of data.categories || []) await putRecord('categories', c);
        for (const b of data.budgets || []) await putRecord('budgets', b);
        for (const r of data.recurringRules || []) await putRecord('recurring_rules', r);

        showToast('Backup restored successfully!', 'success');
        refreshActiveView();
        triggerSync();
      } else {
        showToast('Invalid backup file format.', 'danger');
      }
    } catch (err) {
      showToast('Failed to parse backup JSON file.', 'danger');
    }
  };
  reader.readAsText(file);
});

// Delete Account Handler
DOM.deleteAccountBtn.addEventListener('click', async () => {
  if (confirm('🚨 DANGER! Are you absolutely sure you want to delete your account? All expenses, budgets, categories, and sync records will be permanently wiped out on the server and locally.')) {
    try {
      if (isOnline()) {
        await deleteAccount();
      }
      await clearAllStores();
      logoutUser();
      showToast('Your account and all files have been deleted.', 'warning');
      checkAuth();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
});

// Theme Switcher Toggle
DOM.darkModeToggle.addEventListener('change', (e) => {
  if (e.target.checked) {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  }
});

// ================= EXPENSE CRUD MODAL OPERATIONS =================
const openExpenseModal = async (id = null) => {
  await loadCategories();
  
  if (id) {
    DOM.expenseModalTitle.textContent = 'Edit Expense';
    const exp = await getRecord('expenses', id);
    if (!exp) return;

    DOM.expenseId.value = exp.id;
    DOM.expenseRecurringId.value = exp.recurring_rule_id || '';
    DOM.expenseAmount.value = exp.amount;
    DOM.expenseCategory.value = exp.category_id;
    DOM.expenseCurrency.value = exp.currency || 'USD';
    DOM.expenseDate.value = exp.date;
    DOM.expenseMethod.value = exp.payment_method;
    DOM.expenseNotes.value = exp.notes || '';
    
    // Receipt Photo preview
    if (exp.receipt_url) {
      DOM.receiptPreview.src = exp.receipt_url;
      DOM.receiptPreviewWrap.classList.remove('hidden');
    } else {
      DOM.receiptPreviewWrap.classList.add('hidden');
    }

    DOM.expenseIsRecurring.checked = !!exp.recurring_rule_id;
    DOM.expenseIsRecurring.disabled = true; // prevent editing series assignment directly
    DOM.recurringOptions.classList.add('hidden');
  } else {
    DOM.expenseModalTitle.textContent = 'Log Expense';
    DOM.expenseId.value = '';
    DOM.expenseRecurringId.value = '';
    DOM.expenseAmount.value = '';
    DOM.expenseCurrency.value = getCurrentUser()?.currencyPreference || 'USD';
    DOM.expenseDate.value = new Date().toISOString().slice(0, 10);
    DOM.expenseMethod.value = 'Credit Card';
    DOM.expenseNotes.value = '';
    DOM.expenseReceipt.value = '';
    DOM.receiptPreviewWrap.classList.add('hidden');
    
    DOM.expenseIsRecurring.checked = false;
    DOM.expenseIsRecurring.disabled = false;
    DOM.recurringOptions.classList.add('hidden');
  }

  DOM.expenseModal.classList.remove('hidden');
};

DOM.expenseIsRecurring.addEventListener('change', (e) => {
  if (e.target.checked) {
    DOM.recurringOptions.classList.remove('hidden');
  } else {
    DOM.recurringOptions.classList.add('hidden');
  }
});

// Close modals
document.querySelectorAll('.close-modal').forEach(span => {
  span.addEventListener('click', () => {
    DOM.expenseModal.classList.add('hidden');
    DOM.categoryModal.classList.add('hidden');
    DOM.debtModal.classList.add('hidden');
  });
});

// Modal outside clicks
window.addEventListener('click', (e) => {
  if (e.target === DOM.expenseModal) DOM.expenseModal.classList.add('hidden');
  if (e.target === DOM.categoryModal) DOM.categoryModal.classList.add('hidden');
  if (e.target === DOM.debtModal) DOM.debtModal.classList.add('hidden');
});

// Remove receipt preview in form
DOM.removeReceiptBtn.addEventListener('click', () => {
  DOM.receiptPreview.src = '';
  DOM.receiptPreviewWrap.classList.add('hidden');
  DOM.expenseReceipt.value = '';
});

// Submit Log Expense Form
DOM.expenseModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  DOM.expenseSaveBtn.disabled = true;
  DOM.expenseSaveBtn.textContent = 'Saving...';

  const id = DOM.expenseId.value || generateUUID();
  const recRuleId = DOM.expenseRecurringId.value;
  const amount = parseFloat(DOM.expenseAmount.value);
  const categoryId = DOM.expenseCategory.value;
  const currency = DOM.expenseCurrency.value;
  const date = DOM.expenseDate.value;
  const method = DOM.expenseMethod.value;
  const notes = DOM.expenseNotes.value;
  const isRecurring = DOM.expenseIsRecurring.checked;
  const frequency = DOM.expenseRecurringFrequency.value;

  try {
    let receiptUrl = DOM.receiptPreviewWrap.classList.contains('hidden') ? null : DOM.receiptPreview.src;

    // Handle receipt file upload if file is chosen and online
    if (DOM.expenseReceipt.files[0]) {
      if (isOnline()) {
        receiptUrl = await uploadReceiptFile(DOM.expenseReceipt.files[0]);
      } else {
        // Fallback Base64 for offline image storage
        receiptUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(DOM.expenseReceipt.files[0]);
        });
      }
    }

    // 1. Handle Recurring Rules creation if new and checked
    let targetRuleId = recRuleId || null;
    if (isRecurring && !recRuleId) {
      targetRuleId = generateUUID();
      
      // Calculate next trigger date
      const dateObj = new Date(date);
      if (frequency === 'daily') dateObj.setDate(dateObj.getDate() + 1);
      else if (frequency === 'weekly') dateObj.setDate(dateObj.getDate() + 7);
      else if (frequency === 'monthly') dateObj.setMonth(dateObj.getMonth() + 1);
      const nextTrigger = dateObj.toISOString().slice(0, 10);

      const rule = {
        id: targetRuleId,
        amount,
        category_id: categoryId,
        payment_method: method,
        notes,
        frequency,
        next_trigger_date: nextTrigger,
        is_active: 1,
        updated_at: new Date().toISOString(),
        is_deleted: 0
      };
      await putRecord('recurring_rules', rule);
    }

    // 2. Put Expense item to local DB
    const expenseRecord = {
      id,
      amount,
      category_id: categoryId,
      date,
      payment_method: method,
      notes,
      receipt_url: receiptUrl,
      recurring_rule_id: targetRuleId,
      currency,
      converted_amount: amount, // simple conversion mock default
      updated_at: new Date().toISOString(),
      is_deleted: 0
    };

    await putRecord('expenses', expenseRecord);
    showToast('Expense saved locally!', 'success');
    DOM.expenseModal.classList.add('hidden');
    
    refreshActiveView();
    triggerSync();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
  } finally {
    DOM.expenseSaveBtn.disabled = false;
    DOM.expenseSaveBtn.textContent = 'Save Expense';
  }
});

// ================= VIEW 6: LEND & BORROW VIEW LOAD =================
const loadDebtsView = async () => {
  const debts = (await getAllRecords('debts')).filter(d => !d.is_deleted);
  
  const filterType = DOM.debtFilterType.value;
  const filterStatus = DOM.debtFilterStatus.value;
  
  // Calculate totals
  let totalLent = 0;
  let totalBorrowed = 0;
  
  debts.forEach(d => {
    if (d.status === 'active') {
      if (d.type === 'lent') {
        totalLent += d.remaining_amount;
      } else {
        totalBorrowed += d.remaining_amount;
      }
    }
  });
  
  DOM.debtsTotalLent.textContent = formatMoney(totalLent);
  DOM.debtsTotalBorrowed.textContent = formatMoney(totalBorrowed);
  
  // Filter debts
  let filtered = debts.filter(d => {
    if (filterType && d.type !== filterType) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });
  
  // Sort by deadline date asc for active, desc for settled
  filtered.sort((a, b) => {
    if (a.status === 'active' && b.status === 'active') {
      return new Date(a.deadline_date) - new Date(b.deadline_date);
    }
    return new Date(b.deadline_date) - new Date(a.deadline_date);
  });
  
  DOM.debtList.innerHTML = '';
  if (filtered.length === 0) {
    DOM.debtListEmpty.classList.remove('hidden');
  } else {
    DOM.debtListEmpty.classList.add('hidden');
    
    filtered.forEach(debt => {
      const isLent = debt.type === 'lent';
      const isSettled = debt.status === 'settled';
      const badgeClass = isLent ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary';
      const typeLabel = isLent ? 'Lent to' : 'Borrowed from';
      
      const termInfo = debt.repayment_type === 'monthly'
        ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
             Monthly Installment: <strong>${formatMoney(debt.monthly_amount)}</strong> (${debt.months} mos)
           </div>`
        : `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
             Repayment Style: <strong>Lumpsum</strong>
           </div>`;

      const statusBadge = isSettled
        ? `<span class="category-badge" style="background-color: rgba(255,255,255,0.05); color: var(--text-muted);">✓ Settled</span>`
        : `<span class="category-badge ${badgeClass}">${debt.type.toUpperCase()}</span>`;
        
      const actionButtons = isSettled
        ? `<button class="action-btn delete-debt-btn" data-id="${debt.id}" title="Delete Record">🗑️</button>`
        : `<button class="btn btn-secondary btn-sm pay-debt-btn" data-id="${debt.id}" style="margin-right: 0.5rem;">💸 Repay</button>
           <button class="action-btn delete-debt-btn" data-id="${debt.id}" title="Delete Record">🗑️</button>`;

      const card = `
        <div class="glass-panel" style="padding: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${debt.person}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ${typeLabel} • Start: ${debt.start_date} • Deadline: <strong>${debt.deadline_date}</strong>
            </div>
            ${termInfo}
            ${debt.notes ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; font-style: italic;">"${debt.notes}"</div>` : ''}
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 1.5rem;">
            <div>
              <div style="font-size: 1.3rem; font-weight: 800; color: ${isLent ? 'var(--success)' : 'var(--danger)'};">
                ${formatMoney(debt.remaining_amount)}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                of ${formatMoney(debt.amount)} initial
              </div>
            </div>
            <div class="actions-cell" style="padding: 0;">
              ${actionButtons}
            </div>
          </div>
        </div>
      `;
      DOM.debtList.insertAdjacentHTML('beforeend', card);
    });
    
    // Attach listeners
    document.querySelectorAll('.pay-debt-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await handleDebtRepayment(id);
      });
    });
    
    document.querySelectorAll('.delete-debt-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this debt record?')) {
          await deleteDebtLocal(id);
        }
      });
    });
  }
};

// Handle debt repayment recording
const handleDebtRepayment = async (id) => {
  const debt = await getRecord('debts', id);
  if (!debt) return;
  
  const defaultPay = debt.repayment_type === 'monthly' ? Math.min(debt.remaining_amount, debt.monthly_amount) : debt.remaining_amount;
  const amtStr = prompt(`Enter payment amount to repay (Remaining: ${formatMoney(debt.remaining_amount)}):`, defaultPay.toFixed(2));
  
  if (amtStr === null) return; // cancel clicked
  const payAmt = parseFloat(amtStr);
  if (isNaN(payAmt) || payAmt <= 0) {
    showToast('Invalid repayment amount', 'danger');
    return;
  }
  
  if (payAmt > debt.remaining_amount + 0.01) {
    showToast('Amount exceeds remaining outstanding balance', 'warning');
    return;
  }
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // 1. Update Debt Record
  debt.remaining_amount = Math.max(0, debt.remaining_amount - payAmt);
  if (debt.remaining_amount <= 0.01) {
    debt.remaining_amount = 0;
    debt.status = 'settled';
  }
  if (debt.repayment_type === 'monthly') {
    debt.last_payment_month = currentMonth;
  }
  debt.updated_at = new Date().toISOString();
  await putRecord('debts', debt);
  
  // 2. Insert corresponding transaction into expenses
  const isLent = debt.type === 'lent';
  const expenseId = generateUUID();
  const expenseRecord = {
    id: expenseId,
    amount: payAmt,
    category_id: 'def-other',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'Bank Transfer',
    notes: isLent ? `Refund received from ${debt.person}` : `Repayment to ${debt.person}`,
    receipt_url: null,
    recurring_rule_id: null,
    currency: getCurrentUser()?.currencyPreference || 'USD',
    converted_amount: payAmt,
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };
  await putRecord('expenses', expenseRecord);
  
  showToast(`Recorded payment of ${formatMoney(payAmt)}! Created expense transaction.`, 'success');
  
  refreshActiveView();
  triggerSync();
};

// Soft delete debt
const deleteDebtLocal = async (id) => {
  const debt = await getRecord('debts', id);
  if (debt) {
    debt.is_deleted = 1;
    debt.updated_at = new Date().toISOString();
    await putRecord('debts', debt);
    showToast('Debt record deleted locally', 'success');
    refreshActiveView();
    triggerSync();
  }
};

// Open debt Modal
const openDebtModal = () => {
  DOM.debtId.value = '';
  DOM.debtPerson.value = '';
  DOM.debtType.value = 'lent';
  DOM.debtAmount.value = '';
  DOM.debtRepaymentType.value = 'lumpsum';
  DOM.debtMonths.value = '1';
  DOM.debtStartDate.value = new Date().toISOString().slice(0, 10);
  DOM.debtDeadlineDate.value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // +30 days default
  DOM.debtNotes.value = '';
  
  DOM.debtMonthlyTermsRow.classList.add('hidden');
  DOM.debtModal.classList.remove('hidden');
};

const toggleDebtMonthlyTerms = () => {
  if (DOM.debtRepaymentType.value === 'monthly') {
    DOM.debtMonthlyTermsRow.classList.remove('hidden');
  } else {
    DOM.debtMonthlyTermsRow.classList.add('hidden');
  }
};

// Save debt submission
const saveDebt = async (e) => {
  e.preventDefault();
  
  const id = DOM.debtId.value || generateUUID();
  const person = DOM.debtPerson.value.trim();
  const type = DOM.debtType.value;
  const amount = parseFloat(DOM.debtAmount.value);
  const repaymentType = DOM.debtRepaymentType.value;
  const months = repaymentType === 'monthly' ? parseInt(DOM.debtMonths.value) || 1 : 1;
  const startDate = DOM.debtStartDate.value;
  const deadlineDate = DOM.debtDeadlineDate.value;
  const notes = DOM.debtNotes.value.trim();
  
  if (!person || isNaN(amount) || amount <= 0) {
    showToast('Please fill all required fields correctly.', 'warning');
    return;
  }
  
  const monthlyAmount = repaymentType === 'monthly' ? amount / months : amount;
  
  const debtRecord = {
    id,
    user_id: getCurrentUser()?.id,
    type,
    person,
    amount,
    repayment_type: repaymentType,
    months,
    monthly_amount: monthlyAmount,
    start_date: startDate,
    deadline_date: deadlineDate,
    remaining_amount: amount,
    last_payment_month: null,
    notes,
    status: 'active',
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };
  
  try {
    DOM.debtSaveBtn.disabled = true;
    DOM.debtSaveBtn.textContent = 'Saving...';
    
    await putRecord('debts', debtRecord);
    showToast('Lend/Borrow record saved locally!', 'success');
    DOM.debtModal.classList.add('hidden');
    
    refreshActiveView();
    triggerSync();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
  } finally {
    DOM.debtSaveBtn.disabled = false;
    DOM.debtSaveBtn.textContent = 'Save Record';
  }
};

// ================= AUTHENTICATION HANDLERS =================
const checkAuth = async () => {
  await initAuth();
  const token = getAuthToken();
  const user = getCurrentUser();

  if (token && user) {
    // Show main UI
    DOM.authContainer.classList.add('hidden');
    DOM.mainContainer.classList.remove('hidden');
    
    // User profile sidebar details
    DOM.userAvatarInitial.textContent = user.name.charAt(0).toUpperCase();
    DOM.userDisplayName.textContent = user.name;
    DOM.userDisplayEmail.textContent = user.email;

    showView('dashboard');
    triggerSync();
  } else {
    // Show login box
    DOM.mainContainer.classList.add('hidden');
    DOM.authContainer.classList.remove('hidden');
    showLoginForm();
  }
};

const showLoginForm = () => {
  DOM.authTitle.textContent = 'Welcome Back';
  DOM.authSubtitle.textContent = 'Enter your credentials to access your finance dashboard';
  DOM.loginForm.classList.remove('hidden');
  DOM.registerForm.classList.add('hidden');
  DOM.resetForm.classList.add('hidden');
};

// Forms toggle listeners
DOM.goRegister.addEventListener('click', (e) => {
  e.preventDefault();
  DOM.authTitle.textContent = 'Create Account';
  DOM.authSubtitle.textContent = 'Get started with AuraFinance and manage your budget';
  DOM.loginForm.classList.add('hidden');
  DOM.registerForm.classList.remove('hidden');
  DOM.resetForm.classList.add('hidden');
});

DOM.goForgot.addEventListener('click', (e) => {
  e.preventDefault();
  DOM.authTitle.textContent = 'Reset Password';
  DOM.authSubtitle.textContent = 'Provide your email address to recover your account';
  DOM.loginForm.classList.add('hidden');
  DOM.registerForm.classList.add('hidden');
  DOM.resetForm.classList.remove('hidden');
});

DOM.goLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
DOM.goLoginReset.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

// Handle Auth submits
DOM.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = DOM.loginForm['login-email'].value.trim();
  const password = DOM.loginForm['login-password'].value;

  try {
    await loginUser(email, password);
    showToast('Login successful!', 'success');
    checkAuth();
  } catch (err) {
    showToast(`Login failed: ${err.message}`, 'danger');
  }
});

DOM.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = DOM.registerForm['register-name'].value.trim();
  const email = DOM.registerForm['register-email'].value.trim();
  const password = DOM.registerForm['register-password'].value;
  const currency = DOM.registerForm['register-currency'].value;

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'warning');
    return;
  }

  try {
    await registerUser(name, email, password, currency);
    showToast('Account created successfully!', 'success');
    checkAuth();
  } catch (err) {
    showToast(`Registration failed: ${err.message}`, 'danger');
  }
});

// Toggle password visibility
DOM.showLoginPassword.addEventListener('change', (e) => {
  const pwdInput = document.getElementById('login-password');
  if (pwdInput) pwdInput.type = e.target.checked ? 'text' : 'password';
});

DOM.showRegisterPassword.addEventListener('change', (e) => {
  const pwdInput = document.getElementById('register-password');
  if (pwdInput) pwdInput.type = e.target.checked ? 'text' : 'password';
});

DOM.resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = DOM.resetForm['reset-email'].value.trim();
  try {
    await resetPassword(email);
    showToast('Reset email instructions sent successfully.', 'success');
    showLoginForm();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// Logout
DOM.logoutBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to sign out?')) {
    logoutUser();
    await clearAllStores();
    showToast('Signed out successfully.', 'info');
    checkAuth();
  }
});

// ================= APP INITIALIZATION =================
const initApp = async () => {
  try {
    // Setup online/offline event handlers
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initialize DB instance
    await openDB();

    // Sidebar Menu clicks
    DOM.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.getAttribute('data-view');
        showView(view);
      });
    });

    // Action Button Clicks
    DOM.syncNowBtn.addEventListener('click', triggerSync);
    DOM.quickAddBtn.addEventListener('click', () => openExpenseModal());
    DOM.dashViewAllExpenses.addEventListener('click', () => showView('expenses'));
    DOM.budgetNewCategoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      DOM.categoryId.value = '';
      DOM.categoryName.value = '';
      DOM.categoryIcon.value = '';
      DOM.categoryModal.classList.remove('hidden');
    });

    // Expenses Filter change listeners
    DOM.expenseSearch.addEventListener('input', loadExpensesView);
    DOM.expenseFilterCategory.addEventListener('change', loadExpensesView);
    DOM.expenseFilterMethod.addEventListener('change', loadExpensesView);
    DOM.expenseFilterStart.addEventListener('change', loadExpensesView);
    DOM.expenseFilterEnd.addEventListener('change', loadExpensesView);
    DOM.expenseSort.addEventListener('change', loadExpensesView);
    
    DOM.clearFiltersBtn.addEventListener('click', () => {
      DOM.expenseSearch.value = '';
      DOM.expenseFilterCategory.value = '';
      DOM.expenseFilterMethod.value = '';
      DOM.expenseFilterStart.value = '';
      DOM.expenseFilterEnd.value = '';
      DOM.expenseSort.value = 'date-desc';
      loadExpensesView();
    });

    // Debts Listeners
    DOM.addDebtBtn.addEventListener('click', openDebtModal);
    DOM.debtFilterType.addEventListener('change', loadDebtsView);
    DOM.debtFilterStatus.addEventListener('change', loadDebtsView);
    DOM.debtRepaymentType.addEventListener('change', toggleDebtMonthlyTerms);
    DOM.debtModalForm.addEventListener('submit', saveDebt);

    // Check auth and display main view or login
    checkAuth();
  } catch (err) {
    console.error('Failed to initialize application:', err);
    alert('Failed to initialize application: ' + err.message + '\n\nPlease ensure cookies/IndexedDB are enabled.');
  }
};

// Start
initApp();
