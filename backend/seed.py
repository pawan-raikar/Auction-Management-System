import os
import uuid
import bcrypt
import sqlite3
import random
import urllib.request
from datetime import datetime, timedelta

DB_NAME = 'auctionedge.db'
MEDIA_DIR = os.path.join(os.path.dirname(__file__), 'media', 'images')

# Real product photos from Unsplash (free-to-use CDN)
# Each tuple: (unsplash_photo_id, descriptive_slug)
PRODUCT_IMAGES = [
    # MacBook Pro
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80&fit=crop",
    # Rolex watch
    "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80&fit=crop",
    # DSLR Camera
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&fit=crop",
    # Oil painting / art
    "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80&fit=crop",
    # Sneakers / Jordan
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&fit=crop",
    # Road bicycle
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop",
    # Pocket watch
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80&fit=crop",
    # Over-ear headphones
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&fit=crop",
    # Leather sofa
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80&fit=crop",
    # Motorcycle
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80&fit=crop",
    # Vacuum cleaner
    "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80&fit=crop",
    # Denim jacket
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80&fit=crop",
    # Badminton / sports racket
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80&fit=crop",
    # Abstract art / painting
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&fit=crop",
    # Laptop / ThinkPad
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&fit=crop",
    # Persian / area rug
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80&fit=crop",
    # Car / hatchback
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80&fit=crop",
    # Books / library
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80&fit=crop",
    # Yeezy / sneakers
    "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80&fit=crop",
    # Camping tent
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80&fit=crop",
]


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def reset_db():
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
    from database import init_db
    init_db()


def hash_pw(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def download_image(url, index):
    """Download image from URL, return saved filename or None on failure."""
    os.makedirs(MEDIA_DIR, exist_ok=True)
    filename = f"seed_{index:02d}_{uuid.uuid4().hex[:8]}.jpg"
    dest = os.path.join(MEDIA_DIR, filename)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        print(f"  [img {index:02d}] OK -> {filename}")
        return filename
    except OSError as e:
        print(f"  [img {index:02d}] FAILED: {e}")
        return None


def seed():
    reset_db()
    conn = get_db_connection()
    c = conn.cursor()

    # ── Users ────────────────────────────────────────────────────────────────
    users = [
        ("admin", "admin@auctionedge.com", "Admin@123", 1),
        ("alice", "alice@demo.com",        "Demo@123",  0),
        ("bob",   "bob@demo.com",          "Demo@123",  0),
        ("carol", "carol@demo.com",        "Demo@123",  0),
    ]
    for username, email, password, is_admin in users:
        c.execute('INSERT INTO users (username,email,password_hash,is_admin) VALUES (?,?,?,?)',
                  (username, email, hash_pw(password), is_admin))
    conn.commit()

    user_rows  = c.execute('SELECT id,username FROM users').fetchall()
    user_map   = {row['username']: row['id'] for row in user_rows}
    regular_users = [u for u in user_map if u != "admin"]

    # ── Download product images ───────────────────────────────────────────────
    print("\n[Downloading product images - this takes ~30s]\n")
    image_filenames = []
    for i, url in enumerate(PRODUCT_IMAGES):
        fname = download_image(url, i + 1)
        image_filenames.append(fname)  # None if download failed

    # ── Listings ─────────────────────────────────────────────────────────────
    # (title, category, desc, starting_value, days_offset, active, reserve_mult, featured, condition)
    listings_data = [
        ("Apple MacBook Pro 14-inch M3 Pro", "Electronics",
         "Barely used — only 2 months old. M3 Pro chip, 18 GB RAM, 512 GB SSD. Original box and accessories included. Zero dead pixels, pristine keyboard.",
         85000, -2, 0, 1.05, 0, "Excellent"),
        ("Vintage Rolex Submariner Date 1975", "Collectibles",
         "Rare Ref.1680 with original tropical dial. Service history available. Correct hands, crown and caseback. Comes with generic bracelet. Authenticity papers from watchmaker.",
         320000, -5, 0, 1.08, 0, "Very Good"),
        ("Canon EOS R5 Body — 0 Shutter Count", "Electronics",
         "Purchased and never used professionally. Body only, all accessories included. IBIS, 45MP sensor. In Canon box with all original packaging.",
         38000, -1, 0, 1.0, 0, "Mint"),
        ("Original Oil Painting — Bombay Monsoon 1989", "Art",
         "Signed original by renowned Goa-based artist. 36×48 inches, oil on canvas. Professionally framed. Certificate of authenticity included.",
         45000, -10, 0, 1.1, 0, "Excellent"),
        ("Nike Air Jordan 1 Chicago 2015 Retro", "Fashion",
         "Size 10 US. Only worn twice for photos. Near DS condition. Original laces still on. OG all retail box and receipt. No yellowing on soles.",
         28000, -3, 0, 1.02, 0, "Mint"),

        # Active listings
        ("Trek Émonda SLR 9 — SRAM Red eTap AXS", "Sports",
         "2022 model, ridden 1,500 km. Full carbon frame, size 54cm. SRAM Red eTap AXS 12-speed groupset. Power meter, Bontrager Aeolus RSL 51 wheels included.",
         185000, 4, 1, 1.15, 1, "Excellent"),
        ("Antique Patek Philippe Pocket Watch c.1910", "Collectibles",
         "18k yellow gold open-face pocket watch. 17-jewel movement, beautifully engraved case. Keeps excellent time. Velvet case included. A rare estate find.",
         95000, 6, 1, 1.2, 1, "Very Good"),
        ("Sony WH-1000XM5 — Sealed Box", "Electronics",
         "Factory sealed. Purchased as backup, never opened. Full Sony warranty. LDAC, Multipoint Bluetooth, 30hr battery.",
         18000, 2, 1, 0, 0, "Mint"),
        ("Italian Leather Sofa Set — 3+1+1 Seats", "Home & Garden",
         "Natuzzi Italia, purchased 2021. Full-aniline leather in cognac. Minor scuff on armrest, invisible when seated. Relocating sale. Buyer must arrange transport.",
         65000, 8, 1, 1.1, 0, "Very Good"),
        ("2021 Royal Enfield Meteor 350 Supernova", "Vehicles",
         "12,000 km on odometer. Single owner, full service history at RE dealership. All accessories — saddlebags, crash guards, seat cowl. Deep black finish.",
         175000, 3, 1, 1.08, 1, "Very Good"),
        ("Dyson V15 Detect Absolute — Full Kit", "Home & Garden",
         "8 months old. All accessories present. Laser detect, HEPA filtration. Cleaned regularly, no loss of suction. Box available.",
         22000, 5, 1, 0, 0, "Excellent"),
        ("Levi's 501 1978 Big E Selvedge Denim Jacket", "Fashion",
         "Vintage authentic Big E tag. Size 42. Selvedge denim, beautiful fade pattern. No repairs, original stitching. One of the rarest pieces in Levi's history.",
         12000, 7, 1, 1.2, 0, "Good"),
        ("Yonex Astrox 99 Tour — White Tiger", "Sports",
         "Strung at 28 lbs with BG-80. Light use — 3 sessions. Comes with original bag and two extra sets of BG-80. Professional stringing included.",
         9500, 2, 1, 0, 0, "Excellent"),
        ("Mixed Media Diptych — 'Urban Drift'", "Art",
         "Two 24×32 inch panels. Acrylic, ink and gold leaf on board. Signed and dated 2023. Studio photographed. Certificate of authenticity. Ready to hang.",
         18000, 9, 1, 1.1, 1, "Mint"),
        ("Lenovo ThinkPad X1 Carbon Gen 11", "Electronics",
         "Intel i7-1365U, 32 GB LPDDR5, 1 TB NVMe SSD. IPS 2.8K OLED display. 6 months old. Used lightly for remote work. All accessories. Ultralight 1.12 kg.",
         88000, 4, 1, 1.05, 0, "Excellent"),
        ("Hand-Knotted Persian Kashan Rug — 10×14 ft", "Home & Garden",
         "High knot density, wool-on-cotton. Rich navy and ivory medallion pattern. Slight fade on one end consistent with age. Authenticated by dealer, c.1960s.",
         42000, 6, 1, 1.15, 0, "Good"),
        ("Maruti Swift 2022 ZXI+ Dual Tone", "Vehicles",
         "16,000 km, single owner. All service records at Maruti. Rear camera, smart steering, factory warranty remaining. Arctic White/Midnight Black roof.",
         680000, 12, 1, 1.05, 1, "Excellent"),
        ("Harry Potter First UK Edition Signed — Bloomsbury 1997", "Collectibles",
         "First print, first issue. J.K. Rowling signature on title page with certificate from auction house. Minor foxing on page edges. Mylar sleeve, acid-free box.",
         280000, 8, 1, 1.25, 1, "Very Good"),
        ("adidas Yeezy Boost 350 V2 Zebra 2022", "Fashion",
         "Size 9 UK. Tried on once indoors. BOOST sole in pristine condition. OG box, extra laces, receipt. Legit check photos available on request.",
         14500, 5, 1, 1.0, 0, "Mint"),
        ("MSR Hubba Hubba NX2 Backpacking Tent", "Sports",
         "Used on 4 trips. No tears in fly or mesh. Stakes and poles in full set. Seams sealed. Ultralight 1.72 kg, 3-season freestanding design.",
         12000, 10, 1, 0, 0, "Good"),
    ]

    now = datetime.now()
    print("\n[Seeding listings]\n", flush=True)
    listing_ids = []
    for i, data in enumerate(listings_data):
        title, cat, desc, start_val, days, active, reserve_mult, featured, cond = data
        end_time  = (now + timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
        seller    = random.choice(regular_users)
        reserve   = round(start_val * reserve_mult) if reserve_mult > 0 else None
        img_fname = image_filenames[i] if i < len(image_filenames) else None

        c.execute('''
            INSERT INTO listings
              (user_id, title, category, description, starting_value, reserve_price,
               condition, is_featured, auction_active, end_time, image)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ''', (user_map[seller], title, cat, desc, start_val, reserve,
              cond, featured, active, end_time, img_fname))
        listing_ids.append(c.lastrowid)

    conn.commit()

    # ── Bids ──────────────────────────────────────────────────────────────────
    total_bids = 0
    for lid in listing_ids:
        listing = c.execute('SELECT starting_value, user_id, auction_active FROM listings WHERE id=?', (lid,)).fetchone()
        bidders  = [u for u in regular_users if user_map[u] != listing['user_id']]
        num_bids = random.randint(4, 12)
        val      = listing['starting_value']
        last_bidder = None

        for _ in range(num_bids):
            bidder   = random.choice(bidders)
            val     += random.choice([500, 1000, 2000, 5000, 10000])
            bid_time = (now - timedelta(days=random.randint(1, 14), hours=random.randint(1, 23))).strftime('%Y-%m-%d %H:%M:%S')
            c.execute('INSERT INTO bids (user_id,listing_id,value,created_at) VALUES (?,?,?,?)',
                      (user_map[bidder], lid, val, bid_time))
            last_bidder  = user_map[bidder]
            total_bids  += 1

        if listing['auction_active'] == 0:
            c.execute('UPDATE listings SET winner_id=? WHERE id=?', (last_bidder, lid))

    conn.commit()

    # ── Watchlist ─────────────────────────────────────────────────────────────
    for username, lids in [("alice", [1, 3, 6, 10, 15]), ("bob", [2, 7, 12, 18]), ("carol", [5, 9, 11, 17])]:
        for lid in lids:
            try:
                c.execute('INSERT INTO watchlist (user_id,listing_id) VALUES (?,?)',
                          (user_map[username], lid))
            except Exception:
                pass

    # ── Comments ──────────────────────────────────────────────────────────────
    sample_comments = [
        "Is this still under warranty?",
        "Can you ship to Hyderabad? What are the charges?",
        "Wonderful piece! Best of luck with the auction.",
        "Any scratches on the body?",
        "Is the reserve price close to the current bid?",
        "Is negotiation possible after auction ends?",
        "Do you have more photos of the item?",
        "What's the lowest you'd accept?",
        "Has this been serviced recently?",
    ]
    for lid in listing_ids:
        for _ in range(random.randint(2, 4)):
            commenter = random.choice(regular_users)
            c.execute('INSERT INTO comments (user_id,listing_id,comment) VALUES (?,?,?)',
                      (user_map[commenter], lid, random.choice(sample_comments)))

    conn.commit()
    conn.close()

    downloaded = sum(1 for f in image_filenames if f)
    print(f"\n[OK] 4 users seeded (1 admin + 3 users)")
    print(f"[OK] 20 listings seeded (5 ended, 15 active)")
    print(f"[OK] {total_bids} bids seeded")
    print(f"[OK] {downloaded}/20 product images downloaded")
    print(f"[OK] Admin: admin@auctionedge.com / Admin@123")
    print(f"[OK] User:  alice@demo.com / Demo@123")


if __name__ == '__main__':
    seed()
