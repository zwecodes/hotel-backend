const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const logger = require('../utils/logger');

/* GET ALL BOOKINGS */
router.get('/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.id, u.name AS user_name, u.email,
              b.check_in_date, b.check_out_date, b.number_of_guests,
              b.total_price, b.status, b.payment_status, b.created_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );

    const [details] = await pool.query(
      `SELECT bd.booking_id, r.room_type, h.name AS hotel_name,
              bd.quantity, bd.price_per_night, bd.total_price
       FROM booking_details bd
       JOIN rooms r ON bd.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id`
    );

    const data = bookings.map(booking => ({
      ...booking,
      hotel_name: details.find(d => d.booking_id === booking.id)?.hotel_name || null,
      rooms: details.filter(d => d.booking_id === booking.id).map(({ booking_id, hotel_name, ...rest }) => rest),
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error('Admin Get Bookings Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* UPDATE BOOKING STATUS */
router.put('/bookings/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const bookingId = req.params.id;

    const [result] = await pool.query(
      'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
      [status, payment_status, bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    logger.info('Admin updated booking status', { bookingId, status, payment_status });
    res.json({ success: true, message: 'Booking updated successfully' });
  } catch (error) {
    logger.error('Admin Update Booking Error', { error: error.message, bookingId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET ALL USERS */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    logger.error('Admin Get Users Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* CREATE HOTEL */
router.post('/hotels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, city, address, phone_number, star_rating } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({ success: false, message: 'Name, city, and address are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO hotels (name, description, city, address, phone_number, star_rating) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, city, address, phone_number, star_rating]
    );

    logger.info('Admin created hotel', { hotelId: result.insertId, name });
    res.status(201).json({ success: true, message: 'Hotel created successfully', hotelId: result.insertId });
  } catch (error) {
    logger.error('Admin Create Hotel Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET ALL HOTELS (ADMIN) */
router.get('/hotels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [hotels] = await pool.query(
      `SELECT id, name, description, city, address, phone_number, star_rating, created_at
       FROM hotels ORDER BY created_at DESC`
    );
    res.json({ success: true, count: hotels.length, data: hotels });
  } catch (error) {
    logger.error('Admin Get Hotels Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* GET HOTEL BY ID (ADMIN) */
router.get('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [hotels] = await pool.query(
      `SELECT id, name, description, city, address, phone_number, star_rating, created_at, updated_at
       FROM hotels WHERE id = ?`,
      [req.params.id]
    );

    if (hotels.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    res.json({ success: true, data: hotels[0] });
  } catch (error) {
    logger.error('Admin Get Hotel Error', { error: error.message, hotelId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* UPDATE HOTEL */
router.put('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, city, address, phone_number, star_rating } = req.body;

    const [result] = await pool.query(
      `UPDATE hotels SET name=?, description=?, city=?, address=?, phone_number=?, star_rating=?, updated_at=NOW() WHERE id=?`,
      [name, description, city, address, phone_number, star_rating, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    logger.info('Admin updated hotel', { hotelId: req.params.id });
    res.json({ success: true, message: 'Hotel updated successfully' });
  } catch (error) {
    logger.error('Admin Update Hotel Error', { error: error.message, hotelId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* DELETE HOTEL */
router.delete('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM hotels WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    logger.info('Admin deleted hotel', { hotelId: req.params.id });
    res.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (error) {
    logger.error('Admin Delete Hotel Error', { error: error.message, hotelId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* CREATE ROOM */
router.post('/rooms', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { hotel_id, room_type, price_per_night, capacity, total_rooms, description } = req.body;

    const [hotel] = await pool.query('SELECT id FROM hotels WHERE id = ?', [hotel_id]);
    if (hotel.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO rooms (hotel_id, room_type, price_per_night, capacity, total_rooms, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [hotel_id, room_type, price_per_night, capacity, total_rooms, description]
    );

    logger.info('Admin created room', { roomId: result.insertId, hotel_id });
    res.status(201).json({ success: true, message: 'Room created successfully', roomId: result.insertId });
  } catch (error) {
    logger.error('Admin Create Room Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* UPDATE ROOM */
router.put('/rooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { room_type, price_per_night, capacity, total_rooms, description } = req.body;

    const [room] = await pool.query('SELECT id FROM rooms WHERE id = ?', [req.params.id]);
    if (room.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await pool.query(
      `UPDATE rooms SET room_type=?, price_per_night=?, capacity=?, total_rooms=?, description=? WHERE id=?`,
      [room_type, price_per_night, capacity, total_rooms, description, req.params.id]
    );

    logger.info('Admin updated room', { roomId: req.params.id });
    res.json({ success: true, message: 'Room updated successfully' });
  } catch (error) {
    logger.error('Admin Update Room Error', { error: error.message, roomId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* DELETE ROOM */
router.delete('/rooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    logger.info('Admin deleted room', { roomId: req.params.id });
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    logger.error('Admin Delete Room Error', { error: error.message, roomId: req.params.id });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ADMIN DASHBOARD ANALYTICS */
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[revenue], [bookings], [users], [hotels], [monthlyRevenue], [topHotels], [bookingStats]] = await Promise.all([
      pool.query(`SELECT IFNULL(SUM(total_price),0) AS totalRevenue FROM bookings WHERE payment_status = 'paid'`),
      pool.query(`SELECT COUNT(*) AS totalBookings FROM bookings`),
      pool.query(`SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'user'`),
      pool.query(`SELECT COUNT(*) AS totalHotels FROM hotels`),
      pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(total_price) AS revenue FROM bookings WHERE payment_status = 'paid' GROUP BY month ORDER BY month ASC`),
      pool.query(`SELECT h.id, h.name, SUM(bd.total_price) AS revenue FROM booking_details bd JOIN rooms r ON bd.room_id = r.id JOIN hotels h ON r.hotel_id = h.id JOIN bookings b ON bd.booking_id = b.id WHERE b.payment_status = 'paid' GROUP BY h.id ORDER BY revenue DESC LIMIT 5`),
      pool.query(`SELECT SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmedBookings, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingBookings, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledBookings FROM bookings`),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue:  revenue[0].totalRevenue,
        totalBookings: bookings[0].totalBookings,
        totalUsers:    users[0].totalUsers,
        totalHotels:   hotels[0].totalHotels,
        bookingStats:  bookingStats[0],
        monthlyRevenue,
        topHotels,
      },
    });
  } catch (error) {
    logger.error('Dashboard Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* HOTEL IMAGES */
router.get('/hotels/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM hotel_images WHERE hotel_id = ? ORDER BY sort_order ASC', [req.params.id]);
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Admin Get Hotel Images Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/hotels/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { image_url, is_primary = 0 } = req.body;
    const hotelId = req.params.id;

    if (!image_url) return res.status(400).json({ success: false, message: 'image_url is required' });

    if (is_primary) {
      await pool.query('UPDATE hotel_images SET is_primary = 0 WHERE hotel_id = ?', [hotelId]);
    }

    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM hotel_images WHERE hotel_id = ?',
      [hotelId]
    );

    const [result] = await pool.query(
      'INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
      [hotelId, image_url, is_primary ? 1 : 0, maxOrder + 1]
    );

    res.status(201).json({ success: true, imageId: result.insertId });
  } catch (error) {
    logger.error('Admin Add Hotel Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/hotels/:id/images/:imageId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM hotel_images WHERE id = ? AND hotel_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    logger.error('Admin Delete Hotel Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/hotels/:id/images/:imageId/primary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE hotel_images SET is_primary = 0 WHERE hotel_id = ?', [req.params.id]);
    await pool.query('UPDATE hotel_images SET is_primary = 1 WHERE id = ? AND hotel_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    logger.error('Admin Set Primary Hotel Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ROOM IMAGES */
router.get('/rooms/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM room_images WHERE room_id = ? ORDER BY sort_order ASC', [req.params.id]);
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Admin Get Room Images Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/rooms/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { image_url, is_primary = 0 } = req.body;
    const roomId = req.params.id;

    if (!image_url) return res.status(400).json({ success: false, message: 'image_url is required' });

    if (is_primary) {
      await pool.query('UPDATE room_images SET is_primary = 0 WHERE room_id = ?', [roomId]);
    }

    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM room_images WHERE room_id = ?',
      [roomId]
    );

    const [result] = await pool.query(
      'INSERT INTO room_images (room_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
      [roomId, image_url, is_primary ? 1 : 0, maxOrder + 1]
    );

    res.status(201).json({ success: true, imageId: result.insertId });
  } catch (error) {
    logger.error('Admin Add Room Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/rooms/:id/images/:imageId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM room_images WHERE id = ? AND room_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    logger.error('Admin Delete Room Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/rooms/:id/images/:imageId/primary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE room_images SET is_primary = 0 WHERE room_id = ?', [req.params.id]);
    await pool.query('UPDATE room_images SET is_primary = 1 WHERE id = ? AND room_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    logger.error('Admin Set Primary Room Image Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;