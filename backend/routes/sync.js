import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Synchronize endpoint
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { lastSyncTime, changes } = req.body;

  // If no lastSyncTime, default to a historical date
  const lastSyncDate = lastSyncTime ? new Date(lastSyncTime).toISOString() : new Date(0).toISOString();
  const currentSyncTime = new Date().toISOString();

  try {
    // Begin Sync Transaction by processing incoming changes from client
    if (changes) {
      // 1. Sync Categories
      if (changes.categories && Array.isArray(changes.categories)) {
        for (const cat of changes.categories) {
          // Check if category exists
          const existing = await dbGet('SELECT updated_at FROM categories WHERE id = ?', [cat.id]);
          if (!existing) {
            // New category, insert
            await dbRun(
              'INSERT INTO categories (id, user_id, name, icon, color, is_default, is_deleted, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
              [cat.id, userId, cat.name, cat.icon, cat.color, cat.is_deleted ? 1 : 0, cat.updated_at || currentSyncTime]
            );
          } else {
            // Compare timestamps
            const clientTime = new Date(cat.updated_at || currentSyncTime).getTime();
            const serverTime = new Date(existing.updated_at).getTime();
            if (clientTime > serverTime) {
              await dbRun(
                'UPDATE categories SET name = ?, icon = ?, color = ?, is_deleted = ?, updated_at = ? WHERE id = ? AND user_id = ?',
                [cat.name, cat.icon, cat.color, cat.is_deleted ? 1 : 0, cat.updated_at || currentSyncTime, cat.id, userId]
              );
            }
          }
        }
      }

      // 2. Sync Expenses
      if (changes.expenses && Array.isArray(changes.expenses)) {
        for (const exp of changes.expenses) {
          const existing = await dbGet('SELECT updated_at FROM expenses WHERE id = ?', [exp.id]);
          if (!existing) {
            await dbRun(
              `INSERT INTO expenses (id, user_id, amount, category_id, date, payment_method, notes, receipt_url, recurring_rule_id, converted_amount, currency, updated_at, is_deleted) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                exp.id,
                userId,
                exp.amount,
                exp.category_id,
                exp.date,
                exp.payment_method,
                exp.notes,
                exp.receipt_url,
                exp.recurring_rule_id,
                exp.converted_amount,
                exp.currency,
                exp.updated_at || currentSyncTime,
                exp.is_deleted ? 1 : 0
              ]
            );
          } else {
            const clientTime = new Date(exp.updated_at || currentSyncTime).getTime();
            const serverTime = new Date(existing.updated_at).getTime();
            if (clientTime > serverTime) {
              await dbRun(
                `UPDATE expenses SET amount = ?, category_id = ?, date = ?, payment_method = ?, notes = ?, receipt_url = ?, 
                 recurring_rule_id = ?, converted_amount = ?, currency = ?, updated_at = ?, is_deleted = ? 
                 WHERE id = ? AND user_id = ?`,
                [
                  exp.amount,
                  exp.category_id,
                  exp.date,
                  exp.payment_method,
                  exp.notes,
                  exp.receipt_url,
                  exp.recurring_rule_id,
                  exp.converted_amount,
                  exp.currency,
                  exp.updated_at || currentSyncTime,
                  exp.is_deleted ? 1 : 0,
                  exp.id,
                  userId
                ]
              );
            }
          }
        }
      }

      // 3. Sync Budgets
      if (changes.budgets && Array.isArray(changes.budgets)) {
        for (const bud of changes.budgets) {
          const existing = await dbGet('SELECT updated_at FROM budgets WHERE id = ?', [bud.id]);
          if (!existing) {
            await dbRun(
              'INSERT INTO budgets (id, user_id, category_id, amount, month, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [bud.id, userId, bud.category_id === 'OVERALL' ? null : bud.category_id, bud.amount, bud.month, bud.updated_at || currentSyncTime, bud.is_deleted ? 1 : 0]
            );
          } else {
            const clientTime = new Date(bud.updated_at || currentSyncTime).getTime();
            const serverTime = new Date(existing.updated_at).getTime();
            if (clientTime > serverTime) {
              await dbRun(
                'UPDATE budgets SET category_id = ?, amount = ?, month = ?, updated_at = ?, is_deleted = ? WHERE id = ? AND user_id = ?',
                [bud.category_id === 'OVERALL' ? null : bud.category_id, bud.amount, bud.month, bud.updated_at || currentSyncTime, bud.is_deleted ? 1 : 0, bud.id, userId]
              );
            }
          }
        }
      }

      // 4. Sync Recurring Rules
      if (changes.recurring_rules && Array.isArray(changes.recurring_rules)) {
        for (const rule of changes.recurring_rules) {
          const existing = await dbGet('SELECT updated_at FROM recurring_rules WHERE id = ?', [rule.id]);
          if (!existing) {
            await dbRun(
              `INSERT INTO recurring_rules (id, user_id, amount, category_id, payment_method, notes, frequency, next_trigger_date, is_active, updated_at, is_deleted) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                rule.id,
                userId,
                rule.amount,
                rule.category_id,
                rule.payment_method,
                rule.notes,
                rule.frequency,
                rule.next_trigger_date,
                rule.is_active ? 1 : 0,
                rule.updated_at || currentSyncTime,
                rule.is_deleted ? 1 : 0
              ]
            );
          } else {
            const clientTime = new Date(rule.updated_at || currentSyncTime).getTime();
            const serverTime = new Date(existing.updated_at).getTime();
            if (clientTime > serverTime) {
              await dbRun(
                `UPDATE recurring_rules SET amount = ?, category_id = ?, payment_method = ?, notes = ?, frequency = ?, 
                 next_trigger_date = ?, is_active = ?, updated_at = ?, is_deleted = ? 
                 WHERE id = ? AND user_id = ?`,
                [
                  rule.amount,
                  rule.category_id,
                  rule.payment_method,
                  rule.notes,
                  rule.frequency,
                  rule.next_trigger_date,
                  rule.is_active ? 1 : 0,
                  rule.updated_at || currentSyncTime,
                  rule.is_deleted ? 1 : 0,
                  rule.id,
                  userId
                ]
              );
            }
          }
        }
      }

      // 5. Sync Debts
      if (changes.debts && Array.isArray(changes.debts)) {
        for (const debt of changes.debts) {
          const existing = await dbGet('SELECT updated_at FROM debts WHERE id = ?', [debt.id]);
          if (!existing) {
            await dbRun(
              `INSERT INTO debts (id, user_id, type, person, amount, repayment_type, months, monthly_amount, 
               start_date, deadline_date, remaining_amount, last_payment_month, notes, status, updated_at, is_deleted) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                debt.id,
                userId,
                debt.type,
                debt.person,
                debt.amount,
                debt.repayment_type,
                debt.months || 1,
                debt.monthly_amount,
                debt.start_date,
                debt.deadline_date,
                debt.remaining_amount,
                debt.last_payment_month,
                debt.notes,
                debt.status || 'active',
                debt.updated_at || currentSyncTime,
                debt.is_deleted ? 1 : 0
              ]
            );
          } else {
            const clientTime = new Date(debt.updated_at || currentSyncTime).getTime();
            const serverTime = new Date(existing.updated_at).getTime();
            if (clientTime > serverTime) {
              await dbRun(
                `UPDATE debts SET type = ?, person = ?, amount = ?, repayment_type = ?, months = ?, monthly_amount = ?, 
                 start_date = ?, deadline_date = ?, remaining_amount = ?, last_payment_month = ?, notes = ?, status = ?, 
                 updated_at = ?, is_deleted = ? 
                 WHERE id = ? AND user_id = ?`,
                [
                  debt.type,
                  debt.person,
                  debt.amount,
                  debt.repayment_type,
                  debt.months || 1,
                  debt.monthly_amount,
                  debt.start_date,
                  debt.deadline_date,
                  debt.remaining_amount,
                  debt.last_payment_month,
                  debt.notes,
                  debt.status || 'active',
                  debt.updated_at || currentSyncTime,
                  debt.is_deleted ? 1 : 0,
                  debt.id,
                  userId
                ]
              );
            }
          }
        }
      }
    }

    // Now gather all updates on server since the lastSyncTime that belong to this user
    const serverCategories = await dbAll(
      'SELECT id, name, icon, color, is_default, is_deleted, updated_at FROM categories WHERE (user_id = ? OR is_default = 1) AND updated_at > ?',
      [userId, lastSyncDate]
    );

    const serverExpenses = await dbAll(
      'SELECT id, amount, category_id, date, payment_method, notes, receipt_url, recurring_rule_id, converted_amount, currency, updated_at, is_deleted FROM expenses WHERE user_id = ? AND updated_at > ?',
      [userId, lastSyncDate]
    );

    const serverBudgets = await dbAll(
      'SELECT id, category_id, amount, month, updated_at, is_deleted FROM budgets WHERE user_id = ? AND updated_at > ?',
      [userId, lastSyncDate]
    );

    const serverRecurringRules = await dbAll(
      'SELECT id, amount, category_id, payment_method, notes, frequency, next_trigger_date, is_active, updated_at, is_deleted FROM recurring_rules WHERE user_id = ? AND updated_at > ?',
      [userId, lastSyncDate]
    );

    const serverDebts = await dbAll(
      'SELECT id, type, person, amount, repayment_type, months, monthly_amount, start_date, deadline_date, remaining_amount, last_payment_month, notes, status, updated_at, is_deleted FROM debts WHERE user_id = ? AND updated_at > ?',
      [userId, lastSyncDate]
    );

    res.json({
      syncTime: currentSyncTime,
      changes: {
        categories: serverCategories,
        expenses: serverExpenses,
        budgets: serverBudgets,
        recurring_rules: serverRecurringRules,
        debts: serverDebts
      }
    });
  } catch (err) {
    console.error('Error during synchronization:', err);
    res.status(500).json({ error: 'Server error during synchronization' });
  }
});

export default router;
