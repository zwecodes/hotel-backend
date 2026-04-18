const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, json, errors } = format;

const isDev = process.env.NODE_ENV !== 'production';

// ── Dev format: colorized + readable ─────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

// ── Prod format: structured JSON for Railway ──────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'hotel-backend' },
  transports: [
    new transports.Console(),
  ],
  exitOnError: false,
});

module.exports = logger;