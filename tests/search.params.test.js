const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { resetSchema, seedInventory, futureDates } = require('./helpers');
const { describeDb } = require('./describeDb');

describe('Search query safety', () => {
  test('search route uses parameterized queries (source lock-in)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'search.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/pool\.query\(/);
    expect(src).toMatch(/LIKE \?/);
    // Keyword must be bound as a param, not spliced into the SQL string
    expect(src).not.toMatch(/LIKE ['"`]?%\$\{keyword\}/);
    expect(src).not.toMatch(/'%" \+ keyword/);
  });
});

describeDb('Search HTTP', () => {
  let app;
  let pool;
  let dates;

  beforeAll(async () => {
    pool = require('../src/config/db');
    app = require('../src/app');
  });

  beforeEach(async () => {
    await resetSchema(pool);
    await seedInventory(pool);
    dates = futureDates(5, 2);
  });

  test('search rejects missing dates', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
  });

  test('search with injection-like keyword does not crash and returns JSON', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({
        check_in: dates.check_in_date,
        check_out: dates.check_out_date,
        keyword: "'; DROP TABLE hotels; --",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const [tables] = await pool.query(`SHOW TABLES LIKE 'hotels'`);
    expect(tables.length).toBe(1);
  });
});
