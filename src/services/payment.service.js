const pool = require('../config/db');
const logger = require('../utils/logger');
const { getStripe, toStripeAmount } = require('../config/stripe');

const CURRENCY = (process.env.STRIPE_CURRENCY || 'thb').toLowerCase();

async function markBookingPaid({ bookingId, paymentIntentId, checkoutSessionId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, user_id, status, payment_status, check_in_date, stripe_payment_intent_id
       FROM bookings WHERE id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return { ok: false, reason: 'not_found' };
    }

    const booking = rows[0];

    // Idempotent: already paid with same (or any) Stripe payment
    if (booking.payment_status === 'paid') {
      await connection.commit();
      return { ok: true, reason: 'already_paid', booking };
    }

    if (booking.status === 'cancelled') {
      await connection.rollback();
      return { ok: false, reason: 'cancelled' };
    }

    await connection.query(
      `UPDATE bookings
       SET payment_status = 'paid',
           status = 'confirmed',
           stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
           stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id)
       WHERE id = ?`,
      [paymentIntentId || null, checkoutSessionId || null, bookingId]
    );

    await connection.commit();

    try {
      const checkInFormatted = new Date(booking.check_in_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, booking_id)
         VALUES (?, 'booking_confirmed', 'Booking Confirmed', ?, ?)`,
        [
          booking.user_id,
          `Payment received for booking #${bookingId}. You're all set for check-in on ${checkInFormatted}.`,
          bookingId,
        ]
      );
    } catch (notifErr) {
      logger.warn('Notification insert failed after payment', {
        error: notifErr.message,
        bookingId,
      });
    }

    logger.info('Booking marked paid via Stripe', {
      bookingId,
      paymentIntentId,
      checkoutSessionId,
    });

    return { ok: true, reason: 'paid', booking };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

const paymentService = {
  async createCheckoutSession({ booking, userId, successUrl, cancelUrl }) {
    if (booking.user_id !== userId) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }
    if (booking.status === 'cancelled') {
      const err = new Error('Cannot pay for a cancelled booking');
      err.status = 400;
      throw err;
    }
    if (booking.payment_status === 'paid') {
      const err = new Error('Booking already paid');
      err.status = 400;
      throw err;
    }

    const stripe = getStripe();
    const amount = toStripeAmount(booking.total_price);

    if (!Number.isFinite(amount) || amount < 1) {
      const err = new Error('Invalid booking amount');
      err.status = 400;
      throw err;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: amount,
            product_data: {
              name: `HotelBook reservation #${booking.id}`,
              description: `Check-in ${booking.check_in_date} → check-out ${booking.check_out_date}`,
            },
          },
        },
      ],
      metadata: {
        booking_id: String(booking.id),
        user_id: String(userId),
      },
      payment_intent_data: {
        metadata: {
          booking_id: String(booking.id),
          user_id: String(userId),
        },
      },
      client_reference_id: String(booking.id),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await pool.query(
      `UPDATE bookings SET stripe_checkout_session_id = ? WHERE id = ?`,
      [session.id, booking.id]
    );

    logger.info('Stripe Checkout session created', {
      bookingId: booking.id,
      sessionId: session.id,
      amount,
      currency: CURRENCY,
    });

    return session;
  },

  async handleWebhookEvent(event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = Number(
        session.metadata?.booking_id || session.client_reference_id
      );

      if (!bookingId) {
        logger.warn('Stripe webhook missing booking_id', { sessionId: session.id });
        return { handled: false };
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

      // Only mark paid when Stripe says payment succeeded
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        logger.warn('Checkout session completed but not paid', {
          sessionId: session.id,
          payment_status: session.payment_status,
        });
        return { handled: false };
      }

      const result = await markBookingPaid({
        bookingId,
        paymentIntentId,
        checkoutSessionId: session.id,
      });

      return { handled: true, result };
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const bookingId = Number(intent.metadata?.booking_id);
      if (!bookingId) {
        return { handled: false };
      }
      const result = await markBookingPaid({
        bookingId,
        paymentIntentId: intent.id,
        checkoutSessionId: null,
      });
      return { handled: true, result };
    }

    return { handled: false };
  },

  markBookingPaid,
};

module.exports = paymentService;
