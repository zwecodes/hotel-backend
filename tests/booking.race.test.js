const request = require('supertest');
const { resetSchema, seedInventory, authHeader, futureDates } = require('./helpers');
const { describeDb } = require('./describeDb');

describeDb('Booking race — last room', () => {
  let app;
  let pool;
  let fixtures;
  let dates;

  beforeAll(async () => {
    pool = require('../src/config/db');
    app = require('../src/app');
  });

  beforeEach(async () => {
    await resetSchema(pool);
    fixtures = await seedInventory(pool);
    dates = futureDates(10, 2);
  });

  test('two concurrent bookings for the last room: one succeeds, one fails', async () => {
    const payload = {
      check_in_date: dates.check_in_date,
      check_out_date: dates.check_out_date,
      number_of_guests: 2,
      rooms: [{ room_id: fixtures.roomId, quantity: 1 }],
    };

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set(authHeader(fixtures.userA))
        .send(payload),
      request(app)
        .post('/api/bookings')
        .set(authHeader(fixtures.userB))
        .send(payload),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const winner = resA.status === 201 ? resA : resB;
    const loser = resA.status === 400 ? resA : resB;

    expect(winner.body.success).toBe(true);
    expect(winner.body.booking_id).toBeDefined();
    expect(loser.body.success).toBe(false);
    expect(loser.body.message).toMatch(/available/i);

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS c FROM bookings WHERE status != 'cancelled'`
    );
    expect(rows[0].c).toBe(1);
  });
});
