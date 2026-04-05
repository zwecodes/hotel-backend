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
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nServer cannot start. Please set the above variables in your .env file or hosting platform.\n');
  process.exit(1);
}

// ── Step 2: Load app and dependencies ────────────────────
const app  = require('./src/app');
const pool = require('./src/config/db');

// Start cron jobs after env validation
require('./src/cron');

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

// ── Step 3: Test DB connection before starting server ────
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Server will start but database operations will fail.');
    // Don't exit — let Railway logs show the issue without crashing the container
  }

  // ── Step 4: Start Express server ──────────────────────
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running in ${ENV} mode on port ${PORT}\n`);
  });

  // ── Step 5: Graceful shutdown ─────────────────────────
  // When Railway or the OS sends a shutdown signal, close connections cleanly
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database pool closed.');
      } catch (err) {
        console.error('Error closing database pool:', err.message);
      }
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Railway sends this
  process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C in local dev

  // ── Step 6: Handle uncaught errors ───────────────────
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
    // Don't exit on unhandled rejections — just log them
  });
}

startServer();