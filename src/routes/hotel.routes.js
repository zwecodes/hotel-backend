const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/* GET ALL HOTELS */
router.get('/', async (req, res) => {
  try {
    const [hotels] = await pool.query('SELECT * FROM hotels');

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    console.error('Get Hotels Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET HOTEL BY ID */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [hotel] = await pool.query(
      'SELECT * FROM hotels WHERE id = ?',
      [id]
    );

    if (hotel.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    res.status(200).json({ success: true, data: hotel[0] });

  } catch (error) {
    console.error('Get Hotel By ID Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET ROOMS WITH LIVE AVAILABILITY — must be before /:hotelId/rooms */
router.get('/:hotelId/rooms/availability', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { check_in, check_out } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'check_in and check_out are required'
      });
    }

    const [rooms] = await pool.query(
      `SELECT 
        r.id,
        r.hotel_id,
        r.room_type,
        r.price_per_night,
        r.capacity,
        r.total_rooms,
        r.description,
        r.total_rooms - COALESCE(
          (SELECT SUM(bd.quantity)
           FROM booking_details bd
           JOIN bookings b ON bd.booking_id = b.id
           WHERE bd.room_id = r.id
             AND b.status != 'cancelled'
             AND b.check_in_date < ?
             AND b.check_out_date > ?
          ), 0
        ) AS available_rooms
       FROM rooms r
       WHERE r.hotel_id = ?`,
      [check_out, check_in, hotelId]
    );

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });

  } catch (error) {
    console.error('Get Room Availability Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET ALL ROOMS FOR A HOTEL */
router.get('/:hotelId/rooms', async (req, res) => {
  try {
    const hotelId = req.params.hotelId;

    const [rooms] = await pool.query(
      'SELECT * FROM rooms WHERE hotel_id = ?',
      [hotelId]
    );

    res.json({ success: true, count: rooms.length, data: rooms });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;