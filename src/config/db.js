const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
  waitForConnections: true,
  connectionLimit: 10,
});

pool.on('connection', () => {
  logger.debug('New DB connection established');
});

module.exports = pool;