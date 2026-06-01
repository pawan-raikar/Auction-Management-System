import os
import bcrypt
import sqlite3
from datetime import datetime, timedelta
import random

DB_NAME = 'auctionedge.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def reset_db():
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
    from database import init_db
    init_db()

def hash_pw(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed():
    reset_db()
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Create Users
    users = [
        ("admin", "admin@auctionedge.com", "Admin@123", 1),
        ("alice", "alice@demo.com", "Demo@123", 0),
        ("bob", "bob@demo.com", "Demo@123", 0),
        ("carol", "carol@demo.com", "Demo@123", 0),
        ("david", "david@demo.com", "Demo@123", 0),
        ("eve", "eve@demo.com", "Demo@123", 0),
        ("frank", "frank@demo.com", "Demo@123", 0),
        ("grace", "grace@demo.com", "Demo@123", 0),
        ("henry", "henry@demo.com", "Demo@123", 0),
        ("iris", "iris@demo.com", "Demo@123", 0),
        ("jack", "jack@demo.com", "Demo@123", 0),
    ]

    for username, email, password, is_admin in users:
        c.execute('''
            INSERT INTO users (username, email, password_hash, is_admin)
            VALUES (?, ?, ?, ?)
        ''', (username, email, hash_pw(password), is_admin))
    
    conn.commit()

    # Get user IDs map
    user_rows = c.execute('SELECT id, username FROM users').fetchall()
    user_map = {row['username']: row['id'] for row in user_rows}

    # 2. Create Listings
    listings_data = [
        # Ended listings
        ("Apple MacBook Pro 14-inch M3", "Electronics", "Almost new, boxed.", 85000, -2, 0),
        ("Vintage Rolex Submariner 1972", "Collectibles", "Rare piece.", 250000, -5, 0),
        ("Canon EOS R5 Camera Body", "Electronics", "Pristine condition.", 35000, -1, 0),
        ("Handcrafted Oil Painting — Mumbai", "Art", "Beautiful landscape.", 5000, -10, 0),
        ("Nike Air Jordan 1 Retro High OG", "Fashion", "Size 9, mint.", 8000, -3, 0),
        # Active listings
        ("Trek FX3 Disc Hybrid Bike", "Sports", "Used for 1 month.", 22000, 3, 1),
        ("Antique Brass Compass 1890s", "Collectibles", "Working condition.", 3500, 5, 1),
        ("Sony WH-1000XM5 Headphones", "Electronics", "Noise cancelling.", 12000, 1, 1),
        ("Premium Leather Sofa Set 3+1+1", "Home & Garden", "Italian leather.", 45000, 7, 1),
        ("2020 Royal Enfield Classic 350", "Vehicles", "10k km done.", 160000, 2, 1),
        ("Dyson V15 Detect Vacuum", "Home & Garden", "With all accessories.", 18000, 4, 1),
        ("Levi's Vintage Denim Jacket 1980s", "Fashion", "Original vintage.", 4500, 6, 1),
        ("Badminton Racket Yonex Astrox 99", "Sports", "Professionally strung.", 7000, 2, 1),
        ("Watercolour Landscape Set (10)", "Art", "By local artist.", 2000, 8, 1),
        ("Lenovo ThinkPad X1 Carbon Gen 11", "Electronics", "i7, 16GB RAM.", 70000, 3, 1),
        ("Persian Hand-Knotted Wool Rug", "Home & Garden", "8x10 ft.", 15000, 5, 1),
        ("Maruti Swift 2019 VXI", "Vehicles", "Single owner.", 420000, 10, 1),
        ("First-Edition Harry Potter Book", "Collectibles", "Good condition.", 9000, 7, 1),
        ("Adidas Ultraboost 22 Size 10", "Fashion", "Worn once.", 5500, 4, 1),
        ("Camping Tent 4-Person Waterproof", "Other", "Used once.", 6000, 9, 1),
    ]

    now = datetime.now()
    regular_users = list(user_map.keys())
    regular_users.remove("admin")

    for i, data in enumerate(listings_data):
        title, category, desc, start_val, days_offset, active = data
        end_time = (now + timedelta(days=days_offset)).strftime('%Y-%m-%d %H:%M:%S')
        seller = random.choice(regular_users)
        
        c.execute('''
            INSERT INTO listings (user_id, title, category, description, starting_value, auction_active, end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_map[seller], title, category, desc, start_val, active, end_time))
    
    conn.commit()
    listing_ids = [row['id'] for row in c.execute('SELECT id FROM listings').fetchall()]

    # 3. Create Bids
    # For each listing, create 3-8 bids
    total_bids = 0
    for listing_id in listing_ids:
        listing = c.execute('SELECT starting_value, user_id, auction_active FROM listings WHERE id = ?', (listing_id,)).fetchone()
        num_bids = random.randint(3, 8)
        current_val = listing['starting_value']
        
        bidders = [u for u in regular_users if user_map[u] != listing['user_id']]
        
        last_bidder = None
        for _ in range(num_bids):
            bidder = random.choice(bidders)
            bid_increment = random.randint(1, 10) * 100
            current_val += bid_increment
            
            bid_time = (now - timedelta(days=random.randint(1, 14), hours=random.randint(1, 24))).strftime('%Y-%m-%d %H:%M:%S')
            
            c.execute('''
                INSERT INTO bids (user_id, listing_id, value, created_at)
                VALUES (?, ?, ?, ?)
            ''', (user_map[bidder], listing_id, current_val, bid_time))
            
            last_bidder = user_map[bidder]
            total_bids += 1
            
        # If listing is ended, set winner
        if listing['auction_active'] == 0:
            c.execute('UPDATE listings SET winner_id = ? WHERE id = ?', (last_bidder, listing_id))

    conn.commit()

    # 4. Watchlist
    watchlist_data = [
        ("alice", [1, 3, 5, 10]),
        ("bob", [2, 7, 18]),
        ("carol", [9, 11, 16])
    ]

    for username, l_ids in watchlist_data:
        for lid in l_ids:
            try:
                c.execute('INSERT INTO watchlist (user_id, listing_id) VALUES (?, ?)', (user_map[username], lid))
            except sqlite3.IntegrityError:
                pass

    conn.commit()

    # 5. Comments
    comments = [
        "Is this still under warranty?",
        "Can you ship to Bangalore?",
        "Lovely item, good luck!",
        "What is the condition of the box?",
        "Would you accept a lower price?"
    ]
    
    for listing_id in listing_ids:
        for _ in range(random.randint(2, 3)):
            commenter = random.choice(regular_users)
            comment_text = random.choice(comments)
            c.execute('''
                INSERT INTO comments (user_id, listing_id, comment)
                VALUES (?, ?, ?)
            ''', (user_map[commenter], listing_id, comment_text))

    conn.commit()
    conn.close()

    print("[v] 11 users created (1 admin + 10 regular)")
    print("[v] 20 listings created (15 active, 5 ended)")
    print(f"[v] {total_bids} total bids seeded")
    print("[v] Admin: admin@auctionedge.com / Admin@123")
    print("[v] Users: alice@demo.com … / Demo@123")

if __name__ == '__main__':
    seed()
