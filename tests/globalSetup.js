const fs = require('fs');
const path = require('path');
const { loadTestEnv, waitForDb } = require('./helpers');

const FLAG = path.join(__dirname, '.db-ready');

module.exports = async () => {
  loadTestEnv();
  try {
    await waitForDb(process.env.CI ? 40 : 8);
    fs.writeFileSync(FLAG, '1');
  } catch (err) {
    fs.writeFileSync(FLAG, '0');
    if (process.env.CI) {
      throw err;
    }
    // eslint-disable-next-line no-console
    console.warn(`\n[tests] ${err.message}\n`);
  }
};
