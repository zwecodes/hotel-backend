const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();


/* CREATE BOOKING */
router.post('/', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { check_in_date, check_out_date, number_of_guests, rooms } = req.body;

    if (!check_in_date || !check_out_date || !rooms || rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'check_in_date, check_out_date, and rooms are required'
      });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out must be after check-in'
      });
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    await connection.beginTransaction();

    let totalPrice = 0;
    const detailsToInsert = [];

    for (const item of rooms) {
      const { room_id, quantity } = item;

      if (!room_id || !quantity || quantity < 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid room_id or quantity in rooms array`
        });
      }

      const [roomData] = await connection.query(
        'SELECT * FROM rooms WHERE id = ? FOR UPDATE',
        [room_id]
      );

      if (roomData.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Room with id ${room_id} not found`
        });
      }

      const room = roomData[0];

      const [overlap] = await connection.query(
        `SELECT COALESCE(SUM(bd.quantity), 0) AS booked
         FROM booking_details bd
         JOIN bookings b ON bd.booking_id = b.id
         WHERE bd.room_id = ?
           AND b.status != 'cancelled'
           AND b.check_in_date < ?
           AND b.check_out_date > ?`,
        [room_id, check_out_date, check_in_date]
      );

      const booked = overlap[0].booked;
      const available = room.total_rooms - booked;

      if (quantity > available) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Only ${available} room(s) available for room id ${room_id} on selected dates`
        });
      }

      const roomTotal = room.price_per_night * quantity * nights;
      totalPrice += roomTotal;

      detailsToInsert.push({
        room_id,
        quantity,
        price_per_night: room.price_per_night,
        total_price: roomTotal
      });
    }

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (user_id, check_in_date, check_out_date, number_of_guests, total_price)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, check_in_date, check_out_date, number_of_guests || null, totalPrice]
    );

    const bookingId = bookingResult.insertId;

    for (const detail of detailsToInsert) {
      await connection.query(
        `INSERT INTO booking_details (booking_id, room_id, quantity, price_per_night, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingId, detail.room_id, detail.quantity, detail.price_per_night, detail.total_price]
      );
    }

    await connection.commit();

    // ── Notification: Booking Reserved (Pay Later) ──
    try {
      const checkInFormatted = new Date(check_in_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, booking_id)
         VALUES (?, 'booking_reserved', 'Booking Reserved', ?, ?)`,
        [
          userId,
          `Your booking #${bookingId} is reserved for check-in on ${checkInFormatted}. Complete payment before check-in to confirm.`,
          bookingId
        ]
      );
    } catch (notifErr) {
      console.error('Notification insert error (non-fatal):', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking_id: bookingId,
      total_price: totalPrice
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create Booking Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    connection.release();
  }
});


/* GET MY BOOKINGS */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [bookings] = await pool.query(
      `SELECT 
        b.id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at
       FROM bookings b
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    const bookingIds = bookings.map(b => b.id);

    let details = [];
    if (bookingIds.length > 0) {
      [details] = await pool.query(
        `SELECT 
          bd.booking_id,
          bd.room_id,
          r.room_type,
          h.name AS hotel_name,
          h.address,
          bd.quantity,
          bd.price_per_night,
          bd.total_price
         FROM booking_details bd
         JOIN rooms r ON bd.room_id = r.id
         JOIN hotels h ON r.hotel_id = h.id
         WHERE bd.booking_id IN (?)`,
        [bookingIds]
      );
    }

    let roomImages = [];
    const roomIds = [...new Set(details.map(d => d.room_id))];
    if (roomIds.length > 0) {
      [roomImages] = await pool.query(
        `SELECT room_id, id, image_url, is_primary, sort_order
         FROM room_images
         WHERE room_id IN (?)
         ORDER BY room_id, is_primary DESC, sort_order ASC`,
        [roomIds]
      );
    }

    const imagesByRoomId = roomIds.reduce((acc, roomId) => {
      acc[roomId] = roomImages
        .filter(img => img.room_id === roomId)
        .map(({ room_id, ...rest }) => rest);
      return acc;
    }, {});

    const data = bookings.map(booking => ({
      ...booking,
      hotel_name: details.find(d => d.booking_id === booking.id)?.hotel_name || null,
      hotel_address: details.find(d => d.booking_id === booking.id)?.address || null,
      rooms: details
        .filter(d => d.booking_id === booking.id)
        .map(({ booking_id, hotel_name, address, ...rest }) => ({
          ...rest,
          images: imagesByRoomId[rest.room_id] || [],
        }))
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Get My Bookings Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/* CANCEL BOOKING */
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;

    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking already cancelled'
      });
    }

    const today = new Date();
    const checkInDate = new Date(booking.check_in_date);

    if (today >= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel after check-in date'
      });
    }

    await pool.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = ?",
      [bookingId]
    );

    // ── Notification: Booking Cancelled by user ──
    try {
      const checkInFormatted = new Date(booking.check_in_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, booking_id)
         VALUES (?, 'booking_cancelled', 'Booking Cancelled', ?, ?)`,
        [
          userId,
          `Your booking #${bookingId} (check-in ${checkInFormatted}) has been cancelled successfully.`,
          bookingId
        ]
      );
    } catch (notifErr) {
      console.error('Notification insert error (non-fatal):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel Booking Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/* PAY BOOKING */
router.patch('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;

    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay for a cancelled booking'
      });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking already paid'
      });
    }

    await pool.query(
      `UPDATE bookings 
       SET payment_status = 'paid', 
           status = 'confirmed'
       WHERE id = ?`,
      [bookingId]
    );

    // ── Notification: Booking Confirmed (paid online) ──
    try {
      const checkInFormatted = new Date(booking.check_in_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, booking_id)
         VALUES (?, 'booking_confirmed', '🎉 Booking Confirmed!', ?, ?)`,
        [
          userId,
          `Payment received for booking #${bookingId}. You're all set for check-in on ${checkInFormatted}. Enjoy your stay!`,
          bookingId
        ]
      );
    } catch (notifErr) {
      console.error('Notification insert error (non-fatal):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment successful. Booking confirmed.'
    });

  } catch (error) {
    console.error('Pay Booking Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/* PAY AT HOTEL */
router.patch('/:id/pay-at-hotel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;

    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookings[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot confirm a cancelled booking' });
    }

    await pool.query(
      `UPDATE bookings SET status = 'confirmed', payment_status = 'pay_at_hotel' WHERE id = ?`,
      [bookingId]
    );

    // ── Notification: Booking Confirmed (pay at hotel) ──
    try {
      const checkInFormatted = new Date(booking.check_in_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, booking_id)
         VALUES (?, 'booking_confirmed', '🎉 Booking Confirmed!', ?, ?)`,
        [
          userId,
          `Booking #${bookingId} is confirmed. Payment due at hotel on check-in (${checkInFormatted}). See you there!`,
          bookingId
        ]
      );
    } catch (notifErr) {
      console.error('Notification insert error (non-fatal):', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Booking confirmed. Pay at hotel on arrival.' });

  } catch (error) {
    console.error('Pay At Hotel Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;