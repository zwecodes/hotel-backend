# HotelBook API

Express REST API for HotelBook — a hotel booking platform I built and own.

Repos: [hotel-frontend](https://github.com/zwecodes/hotel-frontend) · Live demo: [hotelbook-app.vercel.app](https://hotelbook-app.vercel.app)

---

## Stack

- Node.js + Express 5
- mysql2 (TiDB Cloud / MySQL)
- JWT access tokens (15m) + hashed refresh tokens in DB (HttpOnly cookies)
- bcryptjs, express-validator, express-rate-limit, Winston, node-cron

---

## Auth (Phase 1)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Create account (password min 10 chars) |
| `POST /api/auth/login` | Sets `access_token` + `refresh_token` HttpOnly cookies |
| `POST /api/auth/refresh` | Rotates refresh token, issues new access cookie |
| `POST /api/auth/logout` | Revokes refresh token, clears cookies |
| `GET /api/auth/me` | Current user (cookie or Bearer) |
| `POST /api/auth/forgot-password` | Creates reset token (dev: returns/logs reset URL) |
| `POST /api/auth/reset-password` | Sets new password, revokes sessions |

Apply the migration before first run after pull:

```bash
# Against your TiDB/MySQL — does NOT drop data
mysql ... < migrations/001_auth_tokens.sql
```

---

## Local setup

```bash
git clone https://github.com/zwecodes/hotel-backend.git
cd hotel-backend
npm install
cp .env.example .env
# fill DB_* and JWT_SECRET
npm run dev
```

API: `http://localhost:5000`

### Environment

| Variable | Purpose |
|---|---|
| `DB_*` | Database connection |
| `JWT_SECRET` | Signs access JWTs |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `FRONTEND_URL` | Base URL for password-reset links |
| `NODE_ENV` | `development` or `production` |

In production, cookies use `SameSite=None; Secure` so the Vercel frontend can call this API with credentials.

---

## Key routes

| Method | Path | Auth |
|---|---|---|
| GET | `/api/search` | No |
| GET | `/api/hotels/:id` | No |
| POST | `/api/bookings` | User |
| PATCH | `/api/bookings/:id/pay` | User (mock — replace with provider webhook) |
| GET | `/api/admin/*` | Admin |

---

## Production roadmap

Hardening plan lives in the local monorepo folder `docs/PRODUCTION_ROADMAP.md` when you work from the combined workspace. Next up: real payments (Phase 2), then tests/CI.

**Do not run `schema.sql` on a live database** — it drops all tables. Use `migrations/` for existing DBs.

---

## License

Personal project. Built as a university assignment; now maintained solo.
