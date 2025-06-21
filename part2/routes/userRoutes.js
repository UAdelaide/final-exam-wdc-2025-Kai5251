const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET current logged-in user
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user with matching email and password
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE email = ? AND password_hash = ?
    `, [email, password]);

    // No matching user found
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Store user info in session
    req.session.user = {
      user_id: rows[0].user_id,
      username: rows[0].username,
      role: rows[0].role
    };

    // Successful login
    res.json({ message: 'Login successful', user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

// POST logout route - destroys session
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // clear session cookie
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/dogs', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(403).json({ error: 'Not authorised' });
  }

  try {
    const ownerId = req.session.user.user_id;
    const [rows] = await db.query('SELECT dog_id, name FROM Dogs WHERE owner_id = ?', [ownerId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});
