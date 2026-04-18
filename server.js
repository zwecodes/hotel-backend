require('dotenv').config();

// ── Step 1: Validate environment variables before anything else ──
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
];

const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  // Use console.error here intentionally — logger not yet available
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nServer cannot start. Please set the above variables in your .env file or hosting platform.\n');
  process.exit(1);
}

// ── Step 2: Load logger + app + dependencies ──────────────
const logger = require('./src/utils/logger');
const app    = require('./src/app');
const pool   = require('./src/config/db');

// Start cron jobs after env validation
require('./src/cron');

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

// ── Step 3: Test DB connection before starting server ────
async function startServer() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    // Don't exit — let Railway logs show the issue without crashing the container
  }

  // ── Step 4: Start Express server ──────────────────────
  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${ENV} mode on port ${PORT}`);
  });

  // ── Step 5: Graceful shutdown ─────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await pool.end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error('Error closing database pool', { error: err.message });
      }
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Step 6: Handle uncaught errors ───────────────────
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.warn('Unhandled Promise Rejection', { reason: String(reason) });
  });
}

startServer();