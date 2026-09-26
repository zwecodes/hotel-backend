const request = require('supertest');
const { resetSchema, seedInventory, authHeader } = require('./helpers');
const { describeDb } = require('./describeDb');

describeDb('Admin access control', () => {
  let app;
  let pool;
  let fixtures;

  beforeAll(async () => {
    pool = require('../src/config/db');
    app = require('../src/app');
  });

  beforeEach(async () => {
    await resetSchema(pool);
    fixtures = await seedInventory(pool);
  });

  test('non-admin cannot hit /api/admin/dashboard', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(authHeader(fixtures.userA));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  test('admin can hit /api/admin/dashboard', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(authHeader(fixtures.admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
