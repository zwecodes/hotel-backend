const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const useSsl = process.env.DB_SSL !== 'false';

const poolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'test' ? 20 : 10,
  multipleStatements: false,
};

if (useSsl) {
  poolConfig.ssl = {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  };
}

const pool = mysql.createPool(poolConfig);

pool.on('connection', () => {
  logger.debug('New DB connection established');
});

module.exports = pool;
