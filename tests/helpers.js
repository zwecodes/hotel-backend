const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

function loadTestEnv() {
  const envPath = path.join(__dirname, '..', '.env.test');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, override: true });
  }

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-prod-32chars';
  process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.DB_PORT || '3307';
  process.env.DB_USER = process.env.DB_USER || 'hotel';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'hotel';
  process.env.DB_NAME = process.env.DB_NAME || 'hotel_system_test';
  process.env.DB_SSL = process.env.DB_SSL || 'false';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_for_unit_tests_only';
}

async function waitForDb(retries = 30) {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  for (let i = 0; i < retries; i += 1) {
    try {
      const conn = await mysql.createConnection(config);
      await conn.query('SELECT 1');
      await conn.end();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `Cannot connect to test DB at ${config.host}:${config.port}/${config.database}. ` +
      'Start it with: docker compose up -d'
  );
}

async function resetSchema(pool) {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  // mysql2 multipleStatements — use a one-off connection
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  await conn.query(sql);
  await conn.end();
  // Warm the shared pool after wipe
  await pool.query('SELECT 1');
}

async function createUser(pool, { name, email, password, role = 'user' }) {
  const hash = await bcrypt.hash(password, 4);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
  return { id: result.insertId, name, email, role };
}

function authHeader(user) {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  return { Authorization: `Bearer ${token}` };
}

async function seedInventory(pool) {
  const userA = await createUser(pool, {
    name: 'User A',
    email: 'user-a@test.com',
    password: 'password12345',
    role: 'user',
  });
  const userB = await createUser(pool, {
    name: 'User B',
    email: 'user-b@test.com',
    password: 'password12345',
    role: 'user',
  });
  const admin = await createUser(pool, {
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password12345',
    role: 'admin',
  });

  const [hotelResult] = await pool.query(
    `INSERT INTO hotels (name, description, city, address, star_rating)
     VALUES (?, ?, ?, ?, ?)`,
    ['Test Hotel', 'For automated tests', 'Bangkok', '1 Test St', 4]
  );
  const hotelId = hotelResult.insertId;

  const [roomResult] = await pool.query(
    `INSERT INTO rooms (hotel_id, room_type, price_per_night, capacity, total_rooms, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [hotelId, 'Last Room', 1000, 2, 1, 'Only one physical room']
  );

  return {
    userA,
    userB,
    admin,
    hotelId,
    roomId: roomResult.insertId,
  };
}

function futureDates(daysUntilCheckIn = 7, nights = 2) {
  const checkIn = new Date();
  checkIn.setUTCDate(checkIn.getUTCDate() + daysUntilCheckIn);
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + nights);
  const toDate = (d) => d.toISOString().slice(0, 10);
  return { check_in_date: toDate(checkIn), check_out_date: toDate(checkOut) };
}

module.exports = {
  loadTestEnv,
  waitForDb,
  resetSchema,
  createUser,
  authHeader,
  seedInventory,
  futureDates,
};
