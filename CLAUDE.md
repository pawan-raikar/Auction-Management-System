# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Backend (run from `backend/`)
```bash
pip install -r requirements.txt
python seed.py          # wipe DB, download 20 images, seed 4 users + 20 listings + ~160 bids
python app.py           # Flask dev server on port 5003
```

Python executable on this machine: `C:\Users\tast\AppData\Local\Python\bin\python.exe`

### Frontend (run from `frontend/`)
```bash
npm install
npm run dev     # Vite on port 3001 (strictPort — fails if taken)
npm run build
npm run lint
```

---

## Architecture

### Backend
- **Entry point:** `app.py` — Flask app factory. Loads `.env`, configures JWT / CORS / Mail, registers 7 blueprints, calls `init_db()` if DB missing.
- **Database:** `database.py` — SQLite via `sqlite3`. `get_db_connection()` sets `row_factory = sqlite3.Row` and `PRAGMA foreign_keys = ON`. DB file is `backend/auctionedge.db`.
- **Port:** 5003. CORS locked to `http://localhost:3001`.
- **Auth:** JWT via `flask_jwt_extended`. Token stored as `ae_token` in localStorage. All cutoff times use `datetime.utcnow()` (SQLite `CURRENT_TIMESTAMP` is UTC).

### Frontend
- **Port:** 3001 (`strictPort: true` in `vite.config.js`).
- **State:** `AuthContext` (user + token), `ThemeContext` (dark/light), `ToastContext` (auto-dismiss notifications).
- **API:** `src/api.js` — exports `get`, `post`, `put`, `del`, `postForm`. Base URL: `http://localhost:5003/api`. On 401 → clears token + redirects to `/login`.
- **Routing:** React Router v7. `UserOnlyRoute` blocks admin from user pages. `HomeRoute` redirects admin to `/admin`.

### Demo accounts
- Admin: `admin@auctionedge.com` / `Admin@123`
- Users: `alice@demo.com`, `bob@demo.com`, `carol@demo.com` / `Demo@123`

---

## Database Schema

| Table | Key columns |
|---|---|
| `users` | id, username, email, password_hash, is_admin, is_active, profile_picture, bio, address |
| `listings` | id, user_id, title, category, description, starting_value, reserve_price, condition, is_featured, auction_active, winner_id, image, end_time |
| `bids` | id, user_id, listing_id, value, created_at |
| `watchlist` | id, user_id, listing_id (UNIQUE pair) |
| `comments` | id, user_id, listing_id, comment, created_at |
| `otp_verifications` | email, otp, username, password_hash, created_at |
| `login_otps` | email, otp, created_at (unused — login is direct) |
| `password_reset_otps` | email, otp, created_at |
| `notifications` | id, user_id, type, title, body, link, is_read, created_at |

---

## Backend — Function Reference

### `app.py`
| Function | Description |
|---|---|
| `create_app()` | Flask app factory. Configures JWT, CORS, Mail, registers all blueprints, serves `/media/images/<filename>`. |

### `database.py`
| Function | Description |
|---|---|
| `get_db_connection()` | Returns SQLite connection with `row_factory = sqlite3.Row` and foreign keys enabled. Always call `.close()` after use. |
| `init_db()` | Creates all 9 tables if they don't exist. Called by `create_app()` on first run. |

### `routes/auth.py`
| Function | Description |
|---|---|
| `generate_otp()` | Returns a random 6-digit integer. |
| `send_otp_email(to, otp, subject, body_line)` | Sends branded HTML email with OTP digits in individual styled boxes. Runs in a background thread via `threading.Thread` so it never blocks a request. |
| `POST /login` | Validates email + password with bcrypt, checks `is_active`, returns JWT + user object. |
| `POST /register` | Validates fields, hashes password, stores in `otp_verifications` with explicit UTC `created_at`, sends OTP email. |
| `POST /verify-otp` | Looks up `otp_verifications` with 10-minute UTC cutoff, creates user, deletes OTP record, returns JWT. |
| `POST /forgot-password` | Finds user by email, stores OTP in `password_reset_otps` with UTC timestamp, sends email. |
| `POST /reset-password` | Verifies OTP from `password_reset_otps` with UTC cutoff, updates `password_hash`, deletes OTP record. |
| `GET /me` | Returns full user record for the JWT identity. |

**Critical:** All `datetime.utcnow()` — never `datetime.now()`. SQLite `CURRENT_TIMESTAMP` is UTC; local time (IST = UTC+5:30) would make OTPs appear immediately expired.

### `routes/listings.py`
| Function | Description |
|---|---|
| `auto_close(conn)` | Called at the top of every listing read. Finds all listings where `end_time < now` and `auction_active=1`, assigns `winner_id` to top bidder, sends a "You won!" notification. Uses a single connection — no second conn. |
| `listing_time_left(d)` | Adds `time_left_seconds` to a listing dict from `end_time`. |
| `enrich(d, conn, user_id)` | Adds `reserve_met`, `has_reserve`, `lot_number` (LOT-XXXX), `is_trending` (5+ bids), `is_watched` to a listing dict. |
| `get_optional_user_id()` | Returns JWT user ID if token present, else None. Used for watch status on public endpoints. |
| `GET /stats` | Returns `live_auctions`, `total_bids`, `active_bidders`, `categories` for the homepage stats bar. |
| `GET /ending-soon` | Listings where `end_time` is within 24 hours. Used for the amber strip on the home page. |
| `GET /` | Paginated, filtered, sorted listing feed. Params: `search`, `category`, `status`, `sort`, `min_price`, `max_price`, `page`, `per_page` (max 48). Returns `listings`, `total`, `page`, `pages`. |
| `GET /featured` | Top 6 featured active listings ordered by bid count. |
| `GET /<id>` | Single listing + full bid history + comments + up to 4 similar listings (same category, random). |
| `POST /` | Creates listing with optional image upload (saved to `media/images/`). |
| `POST /<id>/bid` | Validates bid > current price, inserts bid, fires `create_notification` for outbid user. |
| `GET /<id>/live` | Lightweight polling endpoint (called every 2s). Returns `bid_count`, `current_price`, `time_left_seconds`, `top_bidder`, `bidding_war` (3+ bids in last 5 min), `recent_bids`. Single connection — previous double-connection bug fixed. |
| `POST /<id>/close` | Owner or admin can close an auction early. Assigns winner, fires won notification. |
| `GET /my` | Logged-in user's own listings. |
| `GET /won` | Listings where `winner_id` = current user. |

### `routes/admin.py`
| Function | Description |
|---|---|
| `admin_required()` | Decorator factory. Wraps route with JWT check + `is_admin` DB lookup. Returns 403 if not admin. |
| `GET /stats` | Full dashboard data: user counts, listing counts, bid counts, revenue (sum of winning bids on closed auctions), category breakdown, monthly bid activity, monthly listing activity, top 5 bidders. |
| `GET /users` | All non-admin users with `listing_count`, `bid_count`, `auctions_won`. |
| `PUT /users/<id>/status` | Toggles `is_active` between 0 and 1. Blocks action on admin users. |
| `DELETE /users/<id>` | Hard-deletes user. Blocks deletion of admin users. |
| `GET /listings` | All listings with seller name, bid count, current price. |
| `PUT /listings/<id>/feature` | Toggles `is_featured`. |
| `POST /listings/<id>/close` | Force-closes any auction. Assigns winner. |
| `DELETE /listings/<id>` | Hard-deletes listing (cascades to bids/comments/watchlist). |
| `GET /bids` | Last 200 bids across platform with bidder email and listing title. |

### `routes/notifications.py`
| Function | Description |
|---|---|
| `create_notification(conn, user_id, type, title, body, link)` | Helper called by `listings.py` (on bid and on close). Inserts into `notifications` table using the same open connection — no extra conn needed. |
| `GET /` | Returns all notifications for current user (max 50) + `unread_count`. |
| `GET /unread-count` | Returns just `unread_count`. Polled every 30s by Navbar. |
| `PUT /read-all` | Sets `is_read=1` for all user notifications. |
| `PUT /<id>/read` | Sets `is_read=1` for one notification. |

### `routes/profile.py`
| Function | Description |
|---|---|
| `GET /` | Returns user record + `stats` dict (`listings_created`, `bids_placed`, `auctions_won`, `watchlist_count`). |
| `PUT /` | Updates `username`, `address`, `bio`, and optionally `profile_picture` (saved to `media/images/`). Checks username uniqueness. |

### `routes/watchlist.py`
| Function | Description |
|---|---|
| `GET /` | Returns all watchlisted listings for current user with `time_left_seconds` and `is_watched=True`. |

### `routes/categories.py`
| Function | Description |
|---|---|
| `GET /` | Returns hardcoded list of 8 categories: Electronics, Fashion, Home & Garden, Sports, Collectibles, Art, Vehicles, Other. |

### `seed.py`
| Function | Description |
|---|---|
| `download_image(url, index)` | Downloads a product photo from Unsplash CDN using `urllib.request`. Saves to `media/images/seed_NN_<uuid>.jpg`. Returns filename or None on failure. |
| `seed()` | Full reseed: deletes DB, calls `init_db()`, inserts 4 users, downloads 20 images, inserts 20 listings (5 ended / 15 active), generates 4–12 random bids per listing, seeds watchlist and comments. |

---

## Frontend — Page Reference

| Page | Route | Description |
|---|---|---|
| `Home.jsx` | `/` | Static promo carousel (4 banners, auto-advance 5s), stats bar, ending-soon strip, paginated listing grid with search/filter/sort. Redirects admin to `/admin`. |
| `Login.jsx` | `/login` | Single-step email + password form. Shows credential reference panel (no fill buttons). Redirects admin to `/admin`, user to `/`. |
| `Register.jsx` | `/register` | 2-step: form → OTP input. On verify success → `/profile`. Resend clears OTP boxes via `resetKey`. |
| `ForgotPassword.jsx` | `/forgot-password` | 2-step: email → OTP + new password in one screen. Resend clears OTP boxes via `resetKey`. |
| `ListingDetail.jsx` | `/listings/:id` | Full listing view. Polls `/live` every 2s. Quick-increment bid buttons. Bid feed. Comments. Similar listings grid. |
| `CreateListing.jsx` | `/create` | Form with category, condition, pricing, end time, image upload. |
| `Profile.jsx` | `/profile` | Edit username, bio, address, avatar. Shows 4 stat cards. |
| `MyListings.jsx` | `/my-listings` | Tabs: My Listings (with close/delete) + Won Auctions. |
| `Watchlist.jsx` | `/watchlist` | Saved listings grid. Removing watch removes from list live. |
| `Notifications.jsx` | `/notifications` | Full notification feed with type icons, time-ago, mark-read. |
| `AdminDashboard.jsx` | `/admin` | 4-tab panel: Overview (4 charts + top bidders), Users, Listings, Bids. |

---

## Frontend — Component Reference

| Component | Description |
|---|---|
| `Navbar.jsx` | Sticky nav. Admin sees only "Admin Panel". User sees Auctions/New Listing/Watchlist/My Activity. Bell icon polls `/unread-count` every 30s. |
| `ListingCard.jsx` | Card with image, badges (Live/Hot/Featured), watch heart, price, bid count, countdown. Hover reveals "Place Bid" overlay. |
| `CountdownTimer.jsx` | Inline or block mode. Color states: normal (green) > 24h, warning (amber) < 24h, urgent (red) < 1h. |
| `Spinner.jsx` | Border-spin CSS loader. Accepts `large` prop. |
| `Modal.jsx` | Backdrop + close on ESC + scroll lock. |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`. With `adminOnly` prop, blocks non-admins. |

---

## Frontend — Context Reference

| Context | Description |
|---|---|
| `AuthContext` | `user`, `setUser`, `login(token, user)`, `logout()`, `loading`. Restores session from `ae_token` in localStorage on mount via `GET /auth/me`. |
| `ThemeContext` | `theme` ('light'/'dark'), `toggleTheme()`. Persisted in localStorage. Sets `data-theme` on `<html>`. |
| `ToastContext` | `showToast(message, type)`. Types: success, error, info, warning. Auto-dismisses after 3.5s. |

---

## Key Constraints

- CORS is locked to `http://localhost:3001` in `app.py`. Change both if deploying.
- Vite `strictPort: true` on port 3001 — if the port is busy, `npm run dev` fails immediately.
- Never use `datetime.now()` for OTP cutoff calculations — always `datetime.utcnow()`.
- `seed.py` must run from the `backend/` directory (relative imports + relative DB path).
- Do not commit `.env`, `auctionedge.db`, or files in `media/images/` — all are gitignored.
- Do not use `Mahadevswamy.bhuvan@skypoint.ai` in any code, seeds, or emails.
