const Stripe = require('stripe');
const request = require('supertest');
const {
  resetSchema,
  seedInventory,
  authHeader,
  futureDates,
} = require('./helpers');
const paymentService = require('../src/services/payment.service');
const { describeDb } = require('./describeDb');

describeDb('Stripe webhook + mark paid', () => {
  let app;
  let pool;
  let fixtures;
  let bookingId;
  let stripe;

  beforeAll(async () => {
    pool = require('../src/config/db');
    app = require('../src/app');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  });

  beforeEach(async () => {
    await resetSchema(pool);
    fixtures = await seedInventory(pool);
    const dates = futureDates(20, 2);

    const created = await request(app)
      .post('/api/bookings')
      .set(authHeader(fixtures.userA))
      .send({
        check_in_date: dates.check_in_date,
        check_out_date: dates.check_out_date,
        number_of_guests: 1,
        rooms: [{ room_id: fixtures.roomId, quantity: 1 }],
      });

    bookingId = created.body.booking_id;
  });

  test('bad webhook signature is rejected and booking stays unpaid', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_bad',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_bad',
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          metadata: { booking_id: String(bookingId) },
          payment_intent: 'pi_test_bad',
        },
      },
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send(Buffer.from(payload));

    expect(res.status).toBe(400);

    const [rows] = await pool.query(
      'SELECT payment_status, status FROM bookings WHERE id = ?',
      [bookingId]
    );
    expect(rows[0].payment_status).toBe('unpaid');
    expect(rows[0].status).toBe('pending');
  });

  test('valid checkout.session.completed marks booking paid (idempotent)', async () => {
    const event = {
      id: 'evt_test_ok',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_ok',
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          metadata: { booking_id: String(bookingId) },
          client_reference_id: String(bookingId),
          payment_intent: 'pi_test_ok',
        },
      },
    };

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);

    const [rows] = await pool.query(
      'SELECT payment_status, status, stripe_payment_intent_id FROM bookings WHERE id = ?',
      [bookingId]
    );
    expect(rows[0].payment_status).toBe('paid');
    expect(rows[0].status).toBe('confirmed');
    expect(rows[0].stripe_payment_intent_id).toBe('pi_test_ok');

    const replayPayload = JSON.stringify({ ...event, id: 'evt_test_ok_replay' });
    const replayHeader = stripe.webhooks.generateTestHeaderString({
      payload: replayPayload,
      secret,
    });
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', replayHeader)
      .send(Buffer.from(replayPayload));

    expect(res2.status).toBe(200);

    const result = await paymentService.markBookingPaid({
      bookingId,
      paymentIntentId: 'pi_test_ok',
      checkoutSessionId: 'cs_test_ok',
    });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('already_paid');
  });
});
