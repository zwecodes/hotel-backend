const fs = require('fs');
const path = require('path');

module.exports = async () => {
  try {
    const pool = require('../src/config/db');
    await pool.end();
  } catch {
    // ignore
  }

  const flag = path.join(__dirname, '.db-ready');
  try {
    fs.unlinkSync(flag);
  } catch {
    // ignore
  }
};
