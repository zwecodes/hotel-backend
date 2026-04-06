const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const router = express.Router();

/* GET PROFILE */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Booking stats
    const [stats] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END), 0) AS total_spent
       FROM bookings WHERE user_id = ?`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        ...users[0],
        stats: stats[0],
      }
    });
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* UPDATE PROFILE — name + email */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check email not taken by another user
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.trim(), userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    await pool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name.trim(), email.trim(), userId]
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated[0],
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* CHANGE PASSWORD */
router.put('/profile/password', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const [users] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashed, userId]
    );

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* UPDATE AVATAR */
router.put('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ success: false, message: 'avatar_url is required' });
    }

    await pool.query(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatar_url, userId]
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: updated[0],
    });
  } catch (error) {
    console.error('Update Avatar Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;