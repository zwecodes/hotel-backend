const request = require('supertest');
const { resetSchema, seedInventory, authHeader, futureDates } = require('./helpers');
const { describeDb } = require('./describeDb');

describeDb('Booking ownership', () => {
  let app;
  let pool;
  let fixtures;
  let dates;
  let bookingId;

  beforeAll(async () => {
    pool = require('../src/config/db');
    app = require('../src/app');
  });

  beforeEach(async () => {
    await resetSchema(pool);
    fixtures = await seedInventory(pool);
    dates = futureDates(14, 2);

    const created = await request(app)
      .post('/api/bookings')
      .set(authHeader(fixtures.userA))
      .send({
        check_in_date: dates.check_in_date,
        check_out_date: dates.check_out_date,
        number_of_guests: 1,
        rooms: [{ room_id: fixtures.roomId, quantity: 1 }],
      });

    expect(created.status).toBe(201);
    bookingId = created.body.booking_id;
  });

  test('user B cannot cancel user A booking', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set(authHeader(fixtures.userB));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    const [rows] = await pool.query('SELECT status FROM bookings WHERE id = ?', [bookingId]);
    expect(rows[0].status).toBe('pending');
  });

  test('user B cannot start checkout for user A booking', async () => {
    const res = await request(app)
      .post('/api/payments/checkout')
      .set(authHeader(fixtures.userB))
      .send({ booking_id: bookingId });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('mock pay endpoint is disabled', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/pay`)
      .set(authHeader(fixtures.userA));

    expect(res.status).toBe(410);
  });
});
