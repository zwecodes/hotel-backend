const cron = require('node-cron');
const pool = require('./config/db');

// Runs every hour — auto-cancels unpaid bookings
// where check-in is within 24 hours
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Checking for expired unpaid bookings...');
  try {
    // First: find the bookings that will be cancelled (so we can notify users)
    const [expiring] = await pool.query(`
      SELECT id, user_id, check_in_date
      FROM bookings
      WHERE payment_status = 'unpaid'
        AND status = 'pending'
        AND check_in_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `);

    if (expiring.length === 0) {
      console.log('[CRON] No expired bookings found');
      return;
    }

    // Cancel them
    const [result] = await pool.query(`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE payment_status = 'unpaid'
        AND status = 'pending'
        AND check_in_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `);

    console.log(`[CRON] Auto-cancelled ${result.affectedRows} unpaid booking(s)`);

    // Insert a notification for each cancelled booking
    for (const booking of expiring) {
      try {
        const checkInFormatted = new Date(booking.check_in_date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, booking_id)
           VALUES (?, 'booking_cancelled', 'Booking Auto-Cancelled', ?, ?)`,
          [
            booking.user_id,
            `Booking #${booking.id} (check-in ${checkInFormatted}) was automatically cancelled because payment was not completed within 24 hours of check-in.`,
            booking.id
          ]
        );
      } catch (notifErr) {
        console.error(`[CRON] Failed to insert notification for booking #${booking.id}:`, notifErr.message);
      }
    }

  } catch (err) {
    console.error('[CRON] Error running auto-cancel:', err.message);
  }
});

console.log('[CRON] Auto-cancel scheduler started');