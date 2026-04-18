# 🚀 Quick Setup Guide — For Team Members

Hi team! Follow these steps to run HotelBook on your local machine.

---

## Step 1 — Get the credentials

Message **Zwe Htet Aung** on Line/Telegram and ask for:
- DB_USER and DB_PASSWORD (for TiDB)
- DB_HOST (if different)
- JWT_SECRET value
- Cloudinary cloud name and upload preset

---

## Step 2 — Clone both repositories

```bash
git clone https://github.com/zwecodes/hotel-frontend.git
git clone https://github.com/zwecodes/hotel-backend.git
```

---

## Step 3 — Setup the Backend

```bash
cd hotel-backend
npm install
```

Create a `.env` file in the `hotel-backend` folder:
```
PORT=5000
NODE_ENV=development
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=        ← fill in from Zwe
DB_PASSWORD=    ← fill in from Zwe
DB_NAME=hotel_system
JWT_SECRET=     ← fill in from Zwe
```

Then run:
```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Server running in development mode on port 5000
```

---

## Step 4 — Setup the Frontend

```bash
cd hotel-frontend
npm install
```

Create a `.env.local` file in the `hotel-frontend` folder:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=    ← fill in from Zwe
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET= ← fill in from Zwe
```

Then run:
```bash
npm run dev
```

Open: `http://localhost:3000`

---

## Step 5 — Test it works

1. Go to `http://localhost:3000`
2. Register a new account
3. Search for hotels
4. Try booking a room

---

## Live Links (no setup needed)

Just open these in your browser to see the live version:
- **Website:** https://hotelbook-app.vercel.app
- **API:** https://hotelbook-backend.up.railway.app/api/hotels

---

## Problems?

| Problem | Who to ask |
|---|---|
| Database won't connect | Zwe Htet Aung |
| Frontend build errors | Kaung Khant Lwin |
| Login not working | Pan Thu Zaw |
| Admin panel issues | Zaw Bo Bo Myint |
| Anything else | Saw Htet Arkar |