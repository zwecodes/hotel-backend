const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');
const paymentService = require('../services/payment.service');

const router = express.Router();

/**
 * POST /api/payments/checkout
 * Body: { booking_id }
 * Creates a Stripe Checkout Session; amount is taken from the booking row (never from the client).
 */
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = Number(req.body.booking_id);

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'booking_id is required' });
    }

    const [rows] = await pool.query(
      `SELECT id, user_id, check_in_date, check_out_date, total_price, status, payment_status
       FROM bookings WHERE id = ? AND user_id = ?`,
      [bookingId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const successUrl = `${frontend}/my-bookings?payment=success&booking_id=${bookingId}`;
    const cancelUrl = `${frontend}/my-bookings?payment=cancelled&booking_id=${bookingId}`;

    const session = await paymentService.createCheckoutSession({
      booking: rows[0],
      userId,
      successUrl,
      cancelUrl,
    });

    res.status(200).json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    if (error.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured. Set STRIPE_SECRET_KEY (sandbox) on the API.',
      });
    }
    logger.error('Create Checkout Error', { error: error.message, userId: req.user?.id });
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.status ? error.message : 'Server error',
    });
  }
});

module.exports = router;
