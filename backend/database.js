import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'expenses.db');

// Connect to SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Helper functions to use async/await with sqlite3
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize Tables
export const initDatabase = async () => {
  // 1. Users Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      currency_preference TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Categories Table (Supports default categories and user custom categories)
  // id is TEXT/UUID to support client-generated unique IDs in offline mode.
  await dbRun(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Expenses Table
  // id is TEXT/UUID for offline sync reconciliation.
  await dbRun(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      receipt_url TEXT,
      recurring_rule_id TEXT,
      converted_amount REAL,
      currency TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // 4. Budgets Table
  // id is TEXT/UUID. category_id can be NULL for the overall monthly budget.
  await dbRun(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category_id TEXT,
      amount REAL NOT NULL,
      month TEXT NOT NULL, -- Format YYYY-MM
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // 5. Recurring Rules Table
  // id is TEXT/UUID.
  await dbRun(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
      next_trigger_date TEXT NOT NULL, -- Format YYYY-MM-DD
      is_active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // 6. Debts Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
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
      status TEXT DEFAULT 'active',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed default categories if none exist
  const defaultCats = [
    { id: 'def-food', name: 'Food', icon: '🍔', color: '#EF4444' },
    { id: 'def-transport', name: 'Transport', icon: '🚗', color: '#3B82F6' },
    { id: 'def-ent', name: 'Entertainment', icon: '🎬', color: '#10B981' },
    { id: 'def-bills', name: 'Bills', icon: '🔌', color: '#F59E0B' },
    { id: 'def-shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899' },
    { id: 'def-health', name: 'Health', icon: '🏥', color: '#8B5CF6' },
    { id: 'def-other', name: 'Other', icon: '🏷️', color: '#6B7280' }
  ];

  const countRow = await dbGet('SELECT COUNT(*) as count FROM categories WHERE is_default = 1');
  if (countRow.count === 0) {
    console.log('Seeding default categories...');
    for (const cat of defaultCats) {
      await dbRun(
        'INSERT INTO categories (id, user_id, name, icon, color, is_default, is_deleted, updated_at) VALUES (?, NULL, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP)',
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }
  }

  // Seed demo user if doesn't exist
  const demoEmail = 'demo@aurafinance.com';
  const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingUser) {
    console.log('Seeding demo user...');
    await dbRun(
      'INSERT INTO users (name, email, password_hash, currency_preference) VALUES (?, ?, ?, ?)',
      ['Demo User', demoEmail, '$2a$10$tX2yXIwCn1GD3qf0hK6kBOCp/KsQeZ1s/3IoNNvPahgFRfJEmqGOW', 'USD']
    );
  }

  console.log('Database initialized successfully.');
};

export default db;
