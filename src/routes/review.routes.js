const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

/* ADD REVIEW */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { hotel_id, rating, comment } = req.body;

    if (!hotel_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews (user_id, hotel_id, rating, comment) VALUES (?, ?, ?, ?)`,
      [userId, hotel_id, rating, comment]
    );

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review_id: result.insertId,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this hotel',
      });
    }
    logger.error('Create Review Error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET REVIEWS OF A HOTEL — paginated */
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const hotelId = req.params.hotelId;
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.max(1, parseInt(req.query.limit) || 5);
    const offset  = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM reviews WHERE hotel_id = ?',
      [hotelId]
    );

    const [reviews] = await pool.query(
      `SELECT 
        r.id, r.user_id, r.rating, r.comment, r.created_at,
        u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.hotel_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [hotelId, limit, offset]
    );

    res.json({ success: true, total, page, limit, count: reviews.length, data: reviews });
  } catch (error) {
    logger.error('Get Reviews Error', { error: error.message, hotelId: req.params.hotelId });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET AVERAGE HOTEL RATING */
router.get('/hotel/:hotelId/rating', async (req, res) => {
  try {
    const [result] = await pool.query(
      `SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews
       FROM reviews WHERE hotel_id = ?`,
      [req.params.hotelId]
    );
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Rating Error', { error: error.message, hotelId: req.params.hotelId });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* EDIT REVIEW */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId   = req.user.id;
    const reviewId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const [reviews] = await pool.query(
      'SELECT * FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (reviews[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own reviews' });
    }

    await pool.query(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [rating, comment, reviewId]
    );

    res.json({ success: true, message: 'Review updated successfully' });
  } catch (error) {
    logger.error('Edit Review Error', { error: error.message, reviewId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;