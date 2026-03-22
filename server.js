require('dotenv').config();

// server.js
require('./src/cron');

const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function testDB() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
