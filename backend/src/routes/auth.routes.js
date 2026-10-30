/**
 * auth.routes.js — /api/auth
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — authenticate and receive JWT
 * GET  /api/auth/me        — return current user (requires token)
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { db }   = require('../models/db');
const { requireAuth } = require('../middleware/auth.middleware');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'interviewiq_secret_change_in_prod_2024';
const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 12;

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET, { expiresIn: JWT_EXPIRY }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'A valid email address is required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const existing = db().get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash   = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db().run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      name.trim(), email.toLowerCase(), hash
    );
    const user  = db().get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);
    const token = signToken(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[POST /auth/register]', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = db().get('SELECT * FROM users WHERE email = ?', (email || '').toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db().get('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('[GET /auth/me]', err);
    return res.status(500).json({ error: 'Could not retrieve user.' });
  }
});

module.exports = router;
