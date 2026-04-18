# 👥 Group P5 — Role & Contribution Breakdown

## Project: HotelBook — Hotel Booking System

---

## Member Roles

---

### 🎨 Kaung Khant Lwin — Frontend Lead (UI/UX)
**Student ID:** 6703114

**Responsibilities:**
- Designed and implemented the overall UI design system
- Built hotel listing page with search filters and pagination
- Built hotel detail page with photo gallery, lightbox, amenities, and location section
- Implemented HotelCard and RoomCard components
- Ensured responsive design across all pages
- Implemented hotel image gallery with thumbnail strip and lightbox viewer
- Built the booking confirm page layout and room photo display

**Key files:**
- `app/hotels/page.js`
- `app/hotels/[id]/page.js`
- `components/HotelCard.js`
- `components/RoomCard.js`
- `components/Footer.js`

---

### 🔧 Pan Thu Zaw — Frontend Logic & Auth
**Student ID:** 6704913

**Responsibilities:**
- Implemented JWT authentication flow (login, register, token storage)
- Built AuthContext for global auth state management
- Implemented axios interceptor for automatic token attachment
- Built login and register pages
- Implemented my-bookings page with status tabs and booking cards
- Built notification bell component with real-time unread count
- Implemented receipt PDF download feature

**Key files:**
- `context/AuthContext.js`
- `lib/api.js`
- `app/auth/login/page.js`
- `app/auth/register/page.js`
- `app/my-bookings/page.js`
- `components/BookingCard.js`
- `components/NotificationBell.js`

---

### ⚙️ Zwe Htet Aung — Backend Lead
**Student ID:** 6703301

**Responsibilities:**
- Designed and built the full REST API architecture
- Implemented JWT authentication with bcrypt password hashing
- Built booking system with transaction-based double-booking prevention
- Implemented pay now, pay later, and pay at hotel flows
- Set up Cloudinary image upload integration
- Implemented Winston structured logging across all routes
- Configured Railway deployment and environment variables
- Set up CORS, rate limiting, and input validation middleware
- Implemented graceful server shutdown and error handling
- Set up node-cron auto-cancel scheduler

**Key files:**
- `server.js`
- `src/routes/booking.routes.js`
- `src/routes/auth.routes.js`
- `src/routes/hotel.routes.js`
- `src/routes/search.routes.js`
- `src/middlewares/`
- `src/utils/logger.js`
- `src/cron.js`

---

### 🗄️ Zaw Bo Bo Myint — Database & Admin Panel
**Student ID:** 6703928

**Responsibilities:**
- Designed the full database schema (9 tables)
- Set up TiDB Cloud instance with SSL configuration
- Created all database tables and relationships
- Built the admin dashboard with analytics and charts
- Implemented hotel and room CRUD for admin
- Built hotel and room image management (upload, set primary, delete)
- Implemented database indexing for performance
- Built admin bookings and user management pages

**Key files:**
- `src/routes/admin.routes.js`
- `src/config/db.js`
- `app/admin/` (all admin pages)

---

### 📋 Saw Htet Arkar — Project Manager & QA
**Student ID:** 6702721

**Responsibilities:**
- Managed project timeline and task assignments via Trello
- Coordinated communication between frontend and backend teams
- Defined API contracts between frontend and backend
- Conducted manual QA testing across all features
- Verified cross-browser compatibility
- Managed GitHub repository and pull request reviews
- Wrote project documentation
- Coordinated deployment testing on Vercel and Railway

---

## How to Contribute

1. Clone the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Push and create a pull request
5. Get reviewed before merging to `main`

---

## Git Workflow

```
main (production)
  └── feature/hotel-search
  └── feature/booking-flow
  └── fix/cors-issue
```

Always branch from `main`, never commit directly to `main`.

---

## Contact

For credentials (DB, Cloudinary), contact **Zwe Htet Aung** (Backend Lead).  
For Trello access, contact **Saw Htet Arkar** (Project Manager).