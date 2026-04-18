const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/* GET all notifications for logged-in user */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, message, is_read, booking_id, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter(n => !n.is_read).length;
    res.json({ success: true, data: rows, unread_count: unreadCount });
  } catch (err) {
    console.error('Get Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* PATCH mark all as read — must be before /:id route */
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Read All Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* PATCH mark one as read */
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Read Notification Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* DELETE one notification */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete Notification Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;