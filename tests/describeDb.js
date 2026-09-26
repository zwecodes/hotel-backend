const fs = require('fs');
const path = require('path');

const FLAG = path.join(__dirname, '.db-ready');

/** Use for suites that need MySQL. Skips locally if Docker is not up; fails hard in CI. */
function describeDb(name, fn) {
  const ready =
    (fs.existsSync(FLAG) && fs.readFileSync(FLAG, 'utf8').trim() === '1') ||
    global.__HOTEL_DB_READY__ === true;
  const runner = ready ? describe : describe.skip;
  return runner(name, fn);
}

module.exports = { describeDb };
