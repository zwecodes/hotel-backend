const cron = require('node-cron');
const pool = require('./config/db');

// Runs every hour — auto-cancels unpaid bookings 
// where check-in is within 24 hours
cron.schedule('* * * * *', async () => {
  console.log('[CRON] Checking for expired unpaid bookings...');
  try {
    const [result] = await pool.query(`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE payment_status = 'unpaid'
        AND status = 'pending'
        AND check_in_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `);
    if (result.affectedRows > 0) {
      console.log(`[CRON] Auto-cancelled ${result.affectedRows} unpaid booking(s)`);
    } else {
      console.log('[CRON] No expired bookings found');
    }
  } catch (err) {
    console.error('[CRON] Error running auto-cancel:', err.message);
  }
});

console.log('[CRON] Auto-cancel scheduler started');