# AuctionEdge

A full-stack online auction platform built with Flask and React. Users can list items, place live bids, track watchlists, and receive real-time outbid notifications. Admins get a dedicated control panel with charts and full user/listing management.

---

## Features

### User
- OTP-based registration (email verification via Gmail)
- Direct email + password login
- OTP-based password reset
- Browse, search, filter, and sort auction listings
- Paginated listing grid (20 per page)
- Place bids with quick-increment buttons
- Live bid polling every 2 seconds on listing detail
- Bidding war detection (3+ bids in 5 minutes)
- Watchlist (save/remove items)
- Comments / Q&A on listings
- Create auction listings with image upload
- Reserve price support
- Countdown timers (days / hours / minutes / seconds)
- "Ending Soon" strip — auctions closing within 24 hours
- Similar listings section on each listing page
- Notifications (outbid alerts, auction won) with unread badge
- Profile page with stats and avatar upload
- Dark / light theme toggle

### Admin
- Dedicated admin panel (admins are blocked from all user routes)
- Overview dashboard with 4 charts:
  - Monthly Bid Activity (Area chart)
  - Listings by Category (Bar chart)
  - Bids vs New Listings overlay (Line chart)
  - Category Distribution (Pie chart)
- Top bidders leaderboard
- User management — suspend, activate, delete
- Listing management — feature toggle, force-close, delete
- Bid activity log (last 200 bids)
- Live platform stats (total users, revenue, bids, active auctions)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Flask-JWT-Extended, Flask-Mail, Flask-CORS |
| Database | SQLite (via Python `sqlite3`) |
| Auth | bcrypt password hashing, JWT tokens, 6-digit email OTP |
| Frontend | React 19, Vite, React Router v7 |
| Charts | Recharts |
| Email | Gmail SMTP via Flask-Mail |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords)

---

### 1. Clone the repository

```bash
git clone https://github.com/pawan-raikar/Auction-Management-System.git
cd Auction-Management-System
```

---

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` directory:

```env
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_16_char_app_password
```

> **Gmail App Password setup:**
> 1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> 2. Create an App Password for "Mail"
> 3. Paste the 16-character password into `MAIL_PASSWORD`

Seed the database with demo data and real product images:

```bash
python seed.py
```

> This downloads 20 real product photos from Unsplash and seeds 4 users, 20 listings, and ~160 bids. Requires an internet connection.

Start the Flask server:

```bash
python app.py
```

Backend runs at `http://localhost:5003`

---

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3001`

---

### 4. Open in browser

Visit `http://localhost:3001`

---

## Demo Accounts

| Role  | Email                     | Password   |
|-------|---------------------------|------------|
| Admin | admin@auctionedge.com     | Admin@123  |
| User  | alice@demo.com            | Demo@123   |
| User  | bob@demo.com              | Demo@123   |
| User  | carol@demo.com            | Demo@123   |

> Admin logs in and lands directly on the Admin Panel. Regular users see the auction marketplace.

---

## Project Structure

```
Auction-Management-System/
├── backend/
│   ├── app.py                  # Flask app factory
│   ├── database.py             # SQLite schema + connection helper
│   ├── seed.py                 # Demo data seeder (downloads images)
│   ├── requirements.txt
│   ├── .env                    # ← create this (not committed)
│   ├── media/images/           # Uploaded + seeded images
│   └── routes/
│       ├── auth.py             # Login, register, OTP, password reset
│       ├── listings.py         # CRUD, bidding, comments, live polling
│       ├── admin.py            # Admin stats + user/listing management
│       ├── profile.py          # Profile read/update
│       ├── watchlist.py        # User watchlist
│       ├── notifications.py    # In-app notifications
│       └── categories.py       # Category list
├── frontend/
│   ├── src/
│   │   ├── pages/              # Route-level page components
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # Auth, Theme, Toast context providers
│   │   ├── api.js              # Fetch wrapper with token injection
│   │   └── index.css           # Design system (tokens, components)
│   ├── vite.config.js          # Port 3001, strictPort
│   └── package.json
├── CLAUDE.md                   # Developer reference
└── README.md
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Email + password → JWT |
| POST | `/register` | Step 1: send OTP to email |
| POST | `/verify-otp` | Step 2: verify OTP → create account |
| POST | `/forgot-password` | Send password reset OTP |
| POST | `/reset-password` | Verify OTP + set new password |
| GET  | `/me` | Get current user (JWT required) |

### Listings — `/api/listings`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All listings (search, filter, sort, paginate) |
| GET | `/stats` | Homepage stats (live count, bids, bidders) |
| GET | `/featured` | Featured active listings |
| GET | `/ending-soon` | Auctions closing within 24h |
| GET | `/<id>` | Single listing + bids + comments + similar |
| POST | `/` | Create listing (JWT) |
| DELETE | `/<id>` | Delete listing (owner or admin) |
| POST | `/<id>/bid` | Place bid (JWT) |
| POST | `/<id>/close` | Close auction early (owner or admin) |
| POST | `/<id>/watch` | Toggle watchlist (JWT) |
| POST | `/<id>/comments` | Add comment (JWT) |
| GET | `/<id>/live` | Live state poll (bid count, price, timer) |
| GET | `/my` | Logged-in user's listings |
| GET | `/won` | Auctions won by logged-in user |

### Admin — `/api/admin` (admin JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard stats + chart data |
| GET | `/users` | All users with activity counts |
| PUT | `/users/<id>/status` | Suspend / activate user |
| DELETE | `/users/<id>` | Delete user |
| GET | `/listings` | All listings with bid data |
| PUT | `/listings/<id>/feature` | Toggle featured |
| POST | `/listings/<id>/close` | Force-close auction |
| DELETE | `/listings/<id>` | Delete listing |
| GET | `/bids` | Last 200 bids across platform |

### Notifications — `/api/notifications` (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All notifications + unread count |
| GET | `/unread-count` | Unread count only (polled every 30s) |
| PUT | `/read-all` | Mark all as read |
| PUT | `/<id>/read` | Mark one as read |

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Flask session signing key |
| `JWT_SECRET_KEY` | JWT token signing key |
| `MAIL_SERVER` | SMTP server (default: `smtp.gmail.com`) |
| `MAIL_PORT` | SMTP port (default: `587`) |
| `MAIL_USE_TLS` | Use TLS (default: `True`) |
| `MAIL_USERNAME` | Gmail address for sending OTPs |
| `MAIL_PASSWORD` | Gmail App Password (16 chars) |

---

## License

MIT
