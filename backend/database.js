import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'expenses.db');

// Check if PostgreSQL DATABASE_URL is available
const isPostgres = !!process.env.DATABASE_URL;

let sqliteDb = null;
let pgPool = null;

if (isPostgres) {
  console.log('Connecting to PostgreSQL database via DATABASE_URL...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon connection security
    }
  });
} else {
  // Connect to local SQLite Database
  sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error connecting to SQLite database:', err.message);
    } else {
      console.log('Connected to local SQLite database at:', DB_PATH);
    }
  });
}

// SQL parameter converter: converts SQLite "?" placeholders to PostgreSQL "$1", "$2" sequentially
const convertPlaceholders = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

// Helper functions to use async/await with either SQLite or PostgreSQL
export const dbRun = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        let pgSql = convertPlaceholders(sql);
        // Append RETURNING id to INSERT statements to capture auto-incremented primary keys
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING id';
        }
        const res = await pgPool.query(pgSql, params);
        const lastRow = res.rows[0];
        resolve({ id: lastRow ? lastRow.id : null, changes: res.rowCount });
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
};

export const dbGet = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        const pgSql = convertPlaceholders(sql);
        const res = await pgPool.query(pgSql, params);
        resolve(res.rows[0] || null);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
};

export const dbAll = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        const pgSql = convertPlaceholders(sql);
        const res = await pgPool.query(pgSql, params);
        resolve(res.rows);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

// Initialize Tables dynamically based on the current active database driver
export const initDatabase = async () => {
  if (isPostgres) {
    console.log('Initializing PostgreSQL database tables...');
    
    // 1. Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        currency_preference VARCHAR(50) DEFAULT 'INR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Categories Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        color VARCHAR(50) NOT NULL,
        is_default INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Expenses Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category_id VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        payment_method VARCHAR(255) NOT NULL,
        notes TEXT,
        receipt_url TEXT,
        recurring_rule_id VARCHAR(255),
        converted_amount DOUBLE PRECISION,
        currency VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0
      )
    `);

    // 4. Budgets Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS budgets (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category_id VARCHAR(255),
        amount DOUBLE PRECISION NOT NULL,
        month VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0
      )
    `);

    // 5. Recurring Rules Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS recurring_rules (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category_id VARCHAR(255) NOT NULL,
        payment_method VARCHAR(255) NOT NULL,
        notes TEXT,
        frequency VARCHAR(50) NOT NULL,
        next_trigger_date VARCHAR(50) NOT NULL,
        is_active INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0
      )
    `);

    // 6. Debts Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS debts (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        person VARCHAR(255) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        repayment_type VARCHAR(50) NOT NULL,
        months INTEGER DEFAULT 1,
        monthly_amount DOUBLE PRECISION NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        deadline_date VARCHAR(50) NOT NULL,
        remaining_amount DOUBLE PRECISION NOT NULL,
        last_payment_month VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0
      )
    `);

  } else {
    console.log('Initializing SQLite database tables...');

    // 1. Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        currency_preference TEXT DEFAULT 'INR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Categories Table
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
    await dbRun(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category_id TEXT,
        amount REAL NOT NULL,
        month TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // 5. Recurring Rules Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS recurring_rules (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        category_id TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        frequency TEXT NOT NULL,
        next_trigger_date TEXT NOT NULL,
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
  }

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
  const demoEmail = 'demo@hisaab.com';
  const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingUser) {
    console.log('Seeding demo user...');
    await dbRun(
      'INSERT INTO users (name, email, password_hash, currency_preference) VALUES (?, ?, ?, ?)',
      ['Demo User', demoEmail, '$2a$10$tX2yXIwCn1GD3qf0hK6kBOCp/KsQeZ1s/3IoNNvPahgFRfJEmqGOW', 'INR']
    );
  }

  console.log('Database initialized successfully.');
};

export default sqliteDb;
