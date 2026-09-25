const express    = require('express');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const hotelRoutes   = require('./routes/hotel.routes');
const roomRoutes    = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const adminRoutes   = require('./routes/admin.routes');
const searchRoutes  = require('./routes/search.routes');
const reviewRoutes  = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ── Trust proxy (required for Railway / reverse proxies) ──
app.set('trust proxy', 1);

// ── Compression — gzip all responses ─────────────────────
app.use(compression());

// ── CORS (credentials required for HttpOnly auth cookies) ─
const defaultOrigins = [
  'http://localhost:3000',
  'https://hotelbook-app.vercel.app',
];
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (no Origin) and configured frontends
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// ── Global rate limiter — all routes ─────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
  },
});
app.use(globalLimiter);

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;