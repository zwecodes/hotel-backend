const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

/* GET ALL BOOKINGS (ADMIN ONLY) */
/* GET ALL BOOKINGS (ADMIN ONLY) */
router.get('/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {

    const [bookings] = await pool.query(
      `SELECT 
        b.id,
        u.name AS user_name,
        u.email,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );

    const [details] = await pool.query(
      `SELECT 
        bd.booking_id,
        r.room_type,
        h.name AS hotel_name,
        bd.quantity,
        bd.price_per_night,
        bd.total_price
       FROM booking_details bd
       JOIN rooms r ON bd.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id`
    );

    const data = bookings.map(booking => ({
      ...booking,
      hotel_name: details.find(d => d.booking_id === booking.id)?.hotel_name || null,
      rooms: details
        .filter(d => d.booking_id === booking.id)
        .map(({ booking_id, hotel_name, ...rest }) => rest)
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Admin Get Bookings Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});





router.put('/bookings/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const bookingId = req.params.id;

    const [result] = await pool.query(
      'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
      [status, payment_status, bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});




router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});




router.post('/hotels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, city, address, phone_number, star_rating } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, city, and address are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO hotels 
       (name, description, city, address, phone_number, star_rating)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, city, address, phone_number, star_rating]
    );

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully',
      hotelId: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});






router.get('/hotels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [hotels] = await pool.query(
      `SELECT id, name, description, city, address, phone_number, star_rating, created_at 
       FROM hotels 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      count: hotels.length,
      data: hotels
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});






router.get('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const hotelId = req.params.id;

    const [hotels] = await pool.query(
      `SELECT id, name, description, city, address, phone_number, star_rating, created_at, updated_at
       FROM hotels
       WHERE id = ?`,
      [hotelId]
    );

    if (hotels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      data: hotels[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});





router.put('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const hotelId = req.params.id;
    const { name, description, city, address, phone_number, star_rating } = req.body;

    const [result] = await pool.query(
      `UPDATE hotels 
       SET name = ?, 
           description = ?, 
           city = ?, 
           address = ?, 
           phone_number = ?, 
           star_rating = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [name, description, city, address, phone_number, star_rating, hotelId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      message: 'Hotel updated successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});






router.delete('/hotels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const hotelId = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM hotels WHERE id = ?',
      [hotelId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      message: 'Hotel deleted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});




router.post('/rooms', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      hotel_id,
      room_type,
      price_per_night,
      capacity,
      total_rooms,
      description
    } = req.body;

    // Check if hotel exists
    const [hotel] = await pool.query(
      'SELECT id FROM hotels WHERE id = ?',
      [hotel_id]
    );

    if (hotel.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO rooms 
       (hotel_id, room_type, price_per_night, capacity, total_rooms, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hotel_id, room_type, price_per_night, capacity, total_rooms, description]
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      roomId: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});




router.put('/rooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;

    const {
      room_type,
      price_per_night,
      capacity,
      total_rooms,
      description
    } = req.body;

    // Check if room exists
    const [room] = await pool.query(
      'SELECT id FROM rooms WHERE id = ?',
      [roomId]
    );

    if (room.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    await pool.query(
      `UPDATE rooms 
       SET room_type = ?, 
           price_per_night = ?, 
           capacity = ?, 
           total_rooms = ?, 
           description = ?
       WHERE id = ?`,
      [room_type, price_per_night, capacity, total_rooms, description, roomId]
    );

    res.json({
      success: true,
      message: 'Room updated successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});





router.delete('/rooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM rooms WHERE id = ?',
      [roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});





/* ADMIN DASHBOARD ANALYTICS */
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {

    /* TOTAL REVENUE */
    const [revenue] = await pool.query(
      `SELECT IFNULL(SUM(total_price),0) AS totalRevenue
       FROM bookings
       WHERE payment_status = 'paid'`
    );

    /* TOTAL BOOKINGS */
    const [bookings] = await pool.query(
      `SELECT COUNT(*) AS totalBookings
       FROM bookings`
    );

    /* TOTAL USERS */
    const [users] = await pool.query(
      `SELECT COUNT(*) AS totalUsers
       FROM users
       WHERE role = 'user'`
    );

    /* TOTAL HOTELS */
    const [hotels] = await pool.query(
      `SELECT COUNT(*) AS totalHotels
       FROM hotels`
    );

    /* MONTHLY REVENUE */
    const [monthlyRevenue] = await pool.query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total_price) AS revenue
       FROM bookings
       WHERE payment_status = 'paid'
       GROUP BY month
       ORDER BY month ASC`
    );


    /* TOP HOTELS BY REVENUE */
    const [topHotels] = await pool.query(
      `SELECT 
        h.id,
        h.name,
        SUM(bd.total_price) AS revenue
       FROM booking_details bd
       JOIN rooms r ON bd.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       JOIN bookings b ON bd.booking_id = b.id
       WHERE b.payment_status = 'paid'
       GROUP BY h.id
       ORDER BY revenue DESC
       LIMIT 5`
    );



    /* BOOKING STATUS STATS */
const [bookingStats] = await pool.query(
  `SELECT 
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmedBookings,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingBookings,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledBookings
   FROM bookings`
);

    res.json({
      success: true,
      data: {
        totalRevenue: revenue[0].totalRevenue,
        totalBookings: bookings[0].totalBookings,
        totalUsers: users[0].totalUsers,
        totalHotels: hotels[0].totalHotels,

        bookingStats: bookingStats[0],

        monthlyRevenue,
        topHotels
      }
    });

  } catch (error) {
    console.error('Dashboard Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



/* HOTEL IMAGES */
router.get('/hotels/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT * FROM hotel_images WHERE hotel_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json({ success: true, data: images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/hotels/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { image_url, is_primary = 0 } = req.body;
    const hotelId = req.params.id;

    if (!image_url) return res.status(400).json({ success: false, message: 'image_url is required' });

    // If setting as primary, unset others first
    if (is_primary) {
      await pool.query('UPDATE hotel_images SET is_primary = 0 WHERE hotel_id = ?', [hotelId]);
    }

    // Get current max sort_order
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/hotels/:id/images/:imageId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM hotel_images WHERE id = ? AND hotel_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/hotels/:id/images/:imageId/primary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE hotel_images SET is_primary = 0 WHERE hotel_id = ?', [req.params.id]);
    await pool.query('UPDATE hotel_images SET is_primary = 1 WHERE id = ? AND hotel_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ROOM IMAGES */
router.get('/rooms/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT * FROM room_images WHERE room_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json({ success: true, data: images });
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/rooms/:id/images/:imageId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM room_images WHERE id = ? AND room_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/rooms/:id/images/:imageId/primary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE room_images SET is_primary = 0 WHERE room_id = ?', [req.params.id]);
    await pool.query('UPDATE room_images SET is_primary = 1 WHERE id = ? AND room_id = ?', [req.params.imageId, req.params.id]);
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



module.exports = router;
