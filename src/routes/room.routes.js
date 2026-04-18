const express = require('express');
const pool = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

/* GET ROOMS BY HOTEL */
router.get('/hotel/:hotel_id', async (req, res) => {
  try {
    const { hotel_id } = req.params;

    const [rooms] = await pool.query(
      'SELECT * FROM rooms WHERE hotel_id = ?',
      [hotel_id]
    );

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    logger.error('Get Rooms Error:', { error: error.message, hotel_id: req.params.hotel_id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;