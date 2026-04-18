# 🏨 HotelBook — Hotel Booking System

> A full-stack, production-level hotel booking platform built by Group P5.  
> Live at: [hotelbook-app.vercel.app](https://hotelbook-app.vercel.app)

---

## 👥 Team — Group P5

| Student ID | Name | Role |
|---|---|---|
| 6703114 | Kaung Khant Lwin | Frontend Lead (UI/UX) |
| 6704913 | Pan Thu Zaw | Frontend Logic & Auth |
| 6703301 | Zwe Htet Aung | Backend Lead |
| 6703928 | Zaw Bo Bo Myint | Database & Admin Panel |
| 6702721 | Saw Htet Arkar | Project Manager & QA |

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | https://hotelbook-app.vercel.app |
| Backend API | https://hotelbook-backend.up.railway.app |

---

## ✨ Features

- 🔍 **Hotel Search** — search by city, keyword, dates, guests, star rating, price range
- 🏠 **Room Booking** — real-time availability check with double-booking prevention
- 💳 **Payment Flow** — Pay Now (credit card mock), Pay Later, or Pay at Hotel
- 👤 **User Profile** — edit name/email, change password, upload avatar via Cloudinary
- ⭐ **Reviews System** — submit and edit hotel reviews with star ratings and pagination
- 🔔 **Notification System** — in-app notifications for booking status changes
- 🖼️ **Image Gallery** — hotel and room photo galleries with lightbox viewer
- 🧾 **Receipt Download** — printable PDF booking receipt
- 🔐 **JWT Authentication** — secure login/register with role-based access
- 🛡️ **Admin Dashboard** — manage hotels, rooms, bookings, users, and analytics
- ⏰ **Auto-Cancel Cron** — unpaid bookings auto-cancelled 24h before check-in
- 📊 **Winston Logging** — structured production-level logging on the backend

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.2.6** (App Router) — React framework
- **Tailwind CSS** — utility-first styling
- **Axios** — HTTP client with JWT interceptor
- **react-hot-toast** — toast notifications
- **Hosted on:** Vercel

### Backend
- **Node.js + Express** — REST API
- **express-validator** — input validation
- **express-rate-limit** — rate limiting on auth routes
- **node-cron** — scheduled auto-cancel job
- **Winston** — structured logging
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **Hosted on:** Railway

### Database
- **TiDB Cloud** (MySQL-compatible, port 4000, SSL)
- **mysql2** — raw query driver (no ORM)

### Other Services
- **Cloudinary** — image upload and storage
- **Vercel** — frontend deployment
- **Railway** — backend deployment

---

## 🗂️ Project Structure

```
Hotel-System/
├── hotel-frontend/          # Next.js frontend
│   ├── app/                 # App Router pages
│   │   ├── admin/           # Admin panel pages
│   │   ├── auth/            # Login & register
│   │   ├── booking/         # Booking confirm page
│   │   ├── hotels/          # Hotel list & detail
│   │   ├── my-bookings/     # User bookings
│   │   └── profile/         # User profile
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.js
│   │   ├── Footer.js
│   │   ├── HotelCard.js
│   │   ├── RoomCard.js
│   │   ├── BookingCard.js
│   │   ├── ErrorBoundary.js
│   │   └── NotificationBell.js
│   ├── context/
│   │   └── AuthContext.js   # Global auth state
│   └── lib/
│       ├── api.js           # Axios instance + interceptor
│       ├── cloudinary.js    # Image upload helper
│       └── images.js        # Image URL helpers
│
└── hotel-backend/           # Express backend
    ├── server.js            # Entry point + graceful shutdown
    ├── src/
    │   ├── app.js           # Express app + middleware
    │   ├── cron.js          # Auto-cancel scheduler
    │   ├── config/
    │   │   └── db.js        # TiDB connection pool
    │   ├── middlewares/
    │   │   ├── auth.middleware.js
    │   │   └── admin.middleware.js
    │   ├── routes/
    │   │   ├── auth.routes.js
    │   │   ├── hotel.routes.js
    │   │   ├── room.routes.js
    │   │   ├── booking.routes.js
    │   │   ├── review.routes.js
    │   │   ├── search.routes.js
    │   │   ├── user.routes.js
    │   │   ├── admin.routes.js
    │   │   └── notification.routes.js
    │   ├── controllers/
    │   │   └── auth.controller.js
    │   └── utils/
    │       └── logger.js    # Winston logger
```

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `users` | User accounts with roles (user/admin) |
| `hotels` | Hotel listings |
| `rooms` | Room types per hotel |
| `bookings` | Booking records |
| `booking_details` | Room breakdown per booking |
| `hotel_images` | Hotel photo gallery |
| `room_images` | Room photo gallery |
| `reviews` | Hotel reviews |
| `notifications` | In-app user notifications |

---

## ⚙️ Environment Variables

### Backend (`hotel-backend/.env`)

```env
PORT=5000

DB_HOST=your_tidb_host
DB_PORT=4000
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=hotel_system

JWT_SECRET=your_jwt_secret

NODE_ENV=development
```

### Frontend (`hotel-frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- npm
- Access to TiDB Cloud credentials (ask Backend Lead)
- Cloudinary credentials (ask Backend Lead)

### 1. Clone the repository

```bash
git clone https://github.com/zwecodes/hotel-frontend.git
git clone https://github.com/zwecodes/hotel-backend.git
```

### 2. Setup Backend

```bash
cd hotel-backend
npm install
cp .env.example .env
# Fill in your .env values (get from Backend Lead)
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Setup Frontend

```bash
cd hotel-frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 🔑 Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@hotelbook.com | *(ask Backend Lead)* |
| User | user@hotelbook.com | *(ask Backend Lead)* |

---

## 📋 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/search` | Search hotels |
| GET | `/api/hotels/:id` | Hotel detail |
| POST | `/api/bookings` | Create booking |
| PATCH | `/api/bookings/:id/pay` | Pay booking |
| PATCH | `/api/bookings/:id/pay-at-hotel` | Confirm pay at hotel |
| PATCH | `/api/bookings/:id/cancel` | Cancel booking |
| GET | `/api/users/profile` | Get profile |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/admin/dashboard` | Admin analytics |

---

## 🧪 Project Management

- **Tool:** Trello
- **Methodology:** Task-based sprint planning
- **QA:** Manual testing by Project Manager

---

## 📄 License

This project was built for academic purposes by Group P5.