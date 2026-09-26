const fs = require('fs');
const path = require('path');
const { loadTestEnv } = require('./helpers');

loadTestEnv();

const FLAG = path.join(__dirname, '.db-ready');
global.__HOTEL_DB_READY__ = fs.existsSync(FLAG) && fs.readFileSync(FLAG, 'utf8').trim() === '1';
