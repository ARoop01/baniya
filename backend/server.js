import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase, dbRun, dbAll } from './database.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Ensure Uploads Directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve upload folder statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage configuration for receipt photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'receipt-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Receipt Upload API endpoint
app.post('/api/expenses/upload-receipt', upload.single('receipt'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ receiptUrl: fileUrl });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

// Scheduler for Recurring Expenses
const checkRecurringExpenses = async () => {
  console.log('Running recurring expenses check...');
  const todayStr = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const currentTime = new Date().toISOString();

  try {
    // Find all active, non-deleted recurring rules where next_trigger_date is today or in the past
    const pendingRules = await dbAll(
      `SELECT * FROM recurring_rules 
       WHERE is_active = 1 AND is_deleted = 0 AND next_trigger_date <= ?`,
      [todayStr]
    );

    for (const rule of pendingRules) {
      console.log(`Processing recurring rule: ${rule.id} for user: ${rule.user_id}`);
      let triggerDate = rule.next_trigger_date;

      // In case the rule is overdue by multiple cycles, we catch up
      while (triggerDate <= todayStr) {
        const newExpenseId = crypto.randomUUID();
        
        // Insert new expense entry based on the rule
        await dbRun(
          `INSERT INTO expenses (id, user_id, amount, category_id, date, payment_method, notes, receipt_url, recurring_rule_id, converted_amount, currency, updated_at, is_deleted) 
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, 0)`,
          [
            newExpenseId,
            rule.user_id,
            rule.amount,
            rule.category_id,
            triggerDate,
            rule.payment_method,
            rule.notes ? `${rule.notes} (Recurring)` : 'Recurring payment',
            rule.id, // reference the rule
            rule.amount, // converted_amount defaults to amount initially
            currentTime
          ]
        );

        // Update triggerDate for next iteration of loop/cycle calculation
        const dateObj = new Date(triggerDate);
        if (rule.frequency === 'daily') {
          dateObj.setDate(dateObj.getDate() + 1);
        } else if (rule.frequency === 'weekly') {
          dateObj.setDate(dateObj.getDate() + 7);
        } else if (rule.frequency === 'monthly') {
          dateObj.setMonth(dateObj.getMonth() + 1);
        }
        triggerDate = dateObj.toISOString().split('T')[0];
      }

      // Update the next trigger date and updated_at on the rule in the database
      await dbRun(
        'UPDATE recurring_rules SET next_trigger_date = ?, updated_at = ? WHERE id = ?',
        [triggerDate, currentTime, rule.id]
      );
    }
  } catch (err) {
    console.error('Error generating recurring expenses:', err);
  }
};

// Start Server and Init Database
const start = async () => {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`AuraFinance Backend Server running on port ${PORT}`);
      
      // Run once immediately on start
      checkRecurringExpenses();
      
      // Run every hour
      setInterval(checkRecurringExpenses, 1000 * 60 * 60);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
