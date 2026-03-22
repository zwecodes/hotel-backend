const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/* ADD REVIEW */
router.post('/', authMiddleware, async (req, res) => {
  try {

    const userId = req.user.id;
    const { hotel_id, rating, comment } = req.body;

    if (!hotel_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews (user_id, hotel_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [userId, hotel_id, rating, comment]
    );

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review_id: result.insertId
    });

  } catch (error) {

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this hotel'
      });
    }

    console.error('Create Review Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/* GET REVIEWS OF A HOTEL */
router.get('/hotel/:hotelId', async (req, res) => {
  try {

    const hotelId = req.params.hotelId;

    const [reviews] = await pool.query(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.hotel_id = ?
       ORDER BY r.created_at DESC`,
      [hotelId]
    );

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });

  } catch (error) {
    console.error('Get Reviews Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/* GET AVERAGE HOTEL RATING */
router.get('/hotel/:hotelId/rating', async (req, res) => {
  try {

    const hotelId = req.params.hotelId;

    const [result] = await pool.query(
      `SELECT 
        AVG(rating) AS average_rating,
        COUNT(*) AS total_reviews
       FROM reviews
       WHERE hotel_id = ?`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Rating Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
