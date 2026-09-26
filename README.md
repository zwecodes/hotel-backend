# HotelBook API

Express REST API for HotelBook — a hotel booking platform I built and own.

Repos: [hotel-frontend](https://github.com/zwecodes/hotel-frontend) · Live demo: [hotelbook-app.vercel.app](https://hotelbook-app.vercel.app)

---

## Stack

- Node.js + Express 5
- mysql2 (TiDB Cloud / MySQL)
- JWT access tokens (15m) + hashed refresh tokens in DB (HttpOnly cookies)
- **Stripe Checkout** (sandbox) — booking marked `paid` only via signed webhook
- bcryptjs, express-validator, express-rate-limit, Winston, node-cron

---

## Payments (Phase 2)

| Endpoint | Purpose |
|---|---|
| `POST /api/payments/checkout` | Create Stripe Checkout Session (amount from booking row) |
| `POST /api/payments/webhook` | Stripe-signed webhook → marks booking paid (idempotent) |
| `PATCH /api/bookings/:id/pay-at-hotel` | Confirm without online payment |
| `PATCH /api/bookings/:id/pay` | **Removed** (410) — mock pay disabled |

Apply migrations (order matters):

```bash
mysql ... < migrations/001_auth_tokens.sql
mysql ... < migrations/002_stripe_payments.sql
```

### Local Stripe webhook

```bash
# Terminal A — API
npm run dev

# Terminal B — forward webhooks
stripe listen --forward-to localhost:5000/api/payments/webhook
# paste the whsec_... into STRIPE_WEBHOOK_SECRET
```

Sandbox test card: `4242 4242 4242 4242` · any future expiry · any CVC.

---

## Auth (Phase 1)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Create account (password min 10 chars) |
| `POST /api/auth/login` | Sets HttpOnly cookies |
| `POST /api/auth/refresh` | Rotates refresh token |
| `POST /api/auth/logout` | Revokes refresh token |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/forgot-password` | Reset token (dev logs URL) |
| `POST /api/auth/reset-password` | Set new password |

---

## Local setup

```bash
git clone https://github.com/zwecodes/hotel-backend.git
cd hotel-backend
npm install
cp .env.example .env
# fill DB_*, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
npm run dev
```

API: `http://localhost:5000`

### Environment

| Variable | Purpose |
|---|---|
| `DB_*` | Database connection |
| `JWT_SECRET` | Signs access JWTs |
| `CORS_ORIGIN` | Allowed frontend origin(s) |
| `FRONTEND_URL` | Password-reset + Stripe return URLs |
| `STRIPE_SECRET_KEY` | `sk_test_...` sandbox key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe CLI or dashboard |
| `STRIPE_CURRENCY` | Default `thb` |

---

## Key routes

| Method | Path | Auth |
|---|---|---|
| GET | `/api/search` | No |
| POST | `/api/bookings` | User |
| POST | `/api/payments/checkout` | User |
| POST | `/api/payments/webhook` | Stripe signature |
| GET | `/api/admin/*` | Admin |

**Do not run `schema.sql` on a live database** — it drops all tables. Use `migrations/`.

---

## License

Personal project. Built as a university assignment; now maintained solo.
