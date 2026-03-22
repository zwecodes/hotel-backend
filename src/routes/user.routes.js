const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const pool = require('../config/db');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Profile Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
