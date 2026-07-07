import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbRun, dbGet } from '../database.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// 1. Register User
router.post('/register', async (req, res) => {
  const { name, email, password, currencyPreference } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if email already registered
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const currency = currencyPreference || 'USD';

    // Insert user
    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash, currency_preference) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, currency]
    );

    // Generate JWT Token
    const userPayload = { id: result.id, email: email.toLowerCase() };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.id,
        name,
        email: email.toLowerCase(),
        currencyPreference: currency
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error during registration: ${err.message}` });
  }
});

// 2. Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT Token
    const userPayload = { id: user.id, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currencyPreference: user.currency_preference
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error during login: ${err.message}` });
  }
});

// 3. Reset Password (Mock)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  // Mock sending recovery email
  res.json({ message: 'Password recovery email sent! Check your inbox (mocked).' });
});

// 4. Get Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email, currency_preference FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      currencyPreference: user.currency_preference
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error fetching profile: ${err.message}` });
  }
});

// 5. Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, currencyPreference } = req.body;

  if (!name && !currencyPreference) {
    return res.status(400).json({ error: 'Provide name or currency preference to update' });
  }

  try {
    const currentUser = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedName = name || currentUser.name;
    const updatedCurrency = currencyPreference || currentUser.currency_preference;

    await dbRun(
      'UPDATE users SET name = ?, currency_preference = ? WHERE id = ?',
      [updatedName, updatedCurrency, req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: req.user.id,
        name: updatedName,
        email: currentUser.email,
        currencyPreference: updatedCurrency
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error updating profile: ${err.message}` });
  }
});

// 6. Delete Account (Account data export/delete requirement)
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    // Delete user (cascades database due to foreign keys)
    await dbRun('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error deleting account: ${err.message}` });
  }
});

export default router;
