import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from database import get_db_connection
from routes.notifications import create_notification

listings_bp = Blueprint('listings', __name__)
ALLOWED = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
CONDITIONS = ['Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor']


def allowed(fn):
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in ALLOWED


def auto_close(conn):
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    c = conn.cursor()
    expired = c.execute(
        "SELECT id, title FROM listings WHERE auction_active=1 AND end_time IS NOT NULL AND end_time<?", (now,)
    ).fetchall()
    for row in expired:
        lid, title = row['id'], row['title']
        top = c.execute("SELECT user_id, value FROM bids WHERE listing_id=? ORDER BY value DESC LIMIT 1", (lid,)).fetchone()
        winner_id = top['user_id'] if top else None
        c.execute("UPDATE listings SET auction_active=0, winner_id=? WHERE id=?", (winner_id, lid))
        if winner_id:
            create_notification(conn, winner_id, 'won',
                                'You won an auction!',
                                f'Congratulations! You won "{title}" with a bid of ₹{top["value"]:,.0f}.',
                                f'/listings/{lid}')
    if expired:
        conn.commit()


def listing_time_left(d):
    et = d.get('end_time')
    if et:
        try:
            dt = datetime.strptime(et, '%Y-%m-%d %H:%M:%S')
            d['time_left_seconds'] = max(0, int((dt - datetime.now()).total_seconds()))
        except Exception:
            d['time_left_seconds'] = 0
    else:
        d['time_left_seconds'] = 0
    return d


def enrich(d, conn, user_id=None):
    listing_time_left(d)
    rp = d.get('reserve_price')
    cp = d.get('current_price', d.get('starting_value', 0))
    d['reserve_met'] = (rp is None) or (cp >= rp)
    d['has_reserve'] = rp is not None
    d['lot_number'] = f"LOT-{str(d['id']).zfill(4)}"
    d['is_trending'] = d.get('bid_count', 0) >= 5
    if user_id:
        w = conn.execute("SELECT 1 FROM watchlist WHERE user_id=? AND listing_id=?", (user_id, d['id'])).fetchone()
        d['is_watched'] = bool(w)
    else:
        d['is_watched'] = False
    return d


def get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        return int(uid) if uid else None
    except Exception:
        return None


# ── Homepage stats ────────────────────────────────────────────────────────────

@listings_bp.route('/stats', methods=['GET'])
def homepage_stats():
    conn = get_db_connection()
    live = conn.execute("SELECT COUNT(*) AS c FROM listings WHERE auction_active=1").fetchone()['c']
    total_bids = conn.execute("SELECT COUNT(*) AS c FROM bids").fetchone()['c']
    bidders = conn.execute("SELECT COUNT(DISTINCT user_id) AS c FROM bids").fetchone()['c']
    categories_count = conn.execute("SELECT COUNT(DISTINCT category) AS c FROM listings").fetchone()['c']
    conn.close()
    return jsonify({
        "live_auctions": live,
        "total_bids": total_bids,
        "active_bidders": bidders,
        "categories": categories_count,
    }), 200


# ── Ending Soon ───────────────────────────────────────────────────────────────

@listings_bp.route('/ending-soon', methods=['GET'])
def ending_soon():
    conn = get_db_connection()
    auto_close(conn)
    rows = conn.execute('''
        SELECT l.*, u.username AS seller_name,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id
        WHERE l.auction_active=1
          AND l.end_time IS NOT NULL
          AND l.end_time <= datetime('now', '+24 hours')
          AND l.end_time > datetime('now')
        ORDER BY l.end_time ASC LIMIT 8
    ''').fetchall()
    uid = get_optional_user_id()
    result = [enrich(dict(r), conn, uid) for r in rows]
    conn.close()
    return jsonify(result), 200


# ── Public Listings (with pagination) ────────────────────────────────────────

@listings_bp.route('/', methods=['GET'])
def get_listings():
    conn = get_db_connection()
    auto_close(conn)

    search    = request.args.get('search', '')
    category  = request.args.get('category', '')
    status    = request.args.get('status', '')
    sort      = request.args.get('sort', 'newest')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    page      = max(1, int(request.args.get('page', 1)))
    per_page  = min(48, max(1, int(request.args.get('per_page', 20))))

    base = '''
        SELECT l.*, u.username AS seller_name,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id WHERE 1=1
    '''
    params = []

    if search:
        base += ' AND (l.title LIKE ? OR l.description LIKE ?)'
        params += [f'%{search}%', f'%{search}%']
    if category:
        base += ' AND l.category=?'
        params.append(category)
    if status == 'active':
        base += ' AND l.auction_active=1'
    elif status == 'ended':
        base += ' AND l.auction_active=0'

    query = f'SELECT * FROM ({base}) sub WHERE 1=1'
    if min_price:
        query += ' AND current_price>=?'
        params.append(float(min_price))
    if max_price:
        query += ' AND current_price<=?'
        params.append(float(max_price))

    order_map = {
        'newest':      'created_at DESC',
        'oldest':      'created_at ASC',
        'price_asc':   'current_price ASC',
        'price_desc':  'current_price DESC',
        'ending_soon': "CASE WHEN auction_active=1 THEN end_time ELSE '9999-12-31' END ASC",
        'most_bids':   'bid_count DESC',
    }
    query += f' ORDER BY {order_map.get(sort, "created_at DESC")}'

    # Total count (no pagination)
    count_rows = conn.execute(query, params).fetchall()
    total = len(count_rows)

    # Apply pagination
    query += ' LIMIT ? OFFSET ?'
    rows = conn.execute(query, params + [per_page, (page - 1) * per_page]).fetchall()
    uid = get_optional_user_id()
    result = [enrich(dict(r), conn, uid) for r in rows]
    conn.close()
    return jsonify({
        "listings": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }), 200


# ── Featured ──────────────────────────────────────────────────────────────────

@listings_bp.route('/featured', methods=['GET'])
def featured_listings():
    conn = get_db_connection()
    auto_close(conn)
    rows = conn.execute('''
        SELECT l.*, u.username AS seller_name,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id
        WHERE l.is_featured=1 AND l.auction_active=1
        ORDER BY (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) DESC, l.end_time ASC LIMIT 6
    ''').fetchall()
    uid = get_optional_user_id()
    result = [enrich(dict(r), conn, uid) for r in rows]
    conn.close()
    return jsonify(result), 200


# ── Single Listing ────────────────────────────────────────────────────────────

@listings_bp.route('/<int:lid>', methods=['GET'])
def get_listing(lid):
    conn = get_db_connection()
    auto_close(conn)

    row = conn.execute('''
        SELECT l.*, u.username AS seller_name, u.profile_picture AS seller_avatar,
            (SELECT COUNT(*) FROM watchlist WHERE listing_id=l.id) AS watcher_count,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id WHERE l.id=?
    ''', (lid,)).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404

    bids = conn.execute('''
        SELECT b.id, b.value, b.created_at, u.username
        FROM bids b JOIN users u ON b.user_id=u.id
        WHERE b.listing_id=? ORDER BY b.value DESC
    ''', (lid,)).fetchall()

    comments = conn.execute('''
        SELECT c.id, c.comment, c.created_at, u.username, u.profile_picture
        FROM comments c JOIN users u ON c.user_id=u.id
        WHERE c.listing_id=? ORDER BY c.created_at ASC
    ''', (lid,)).fetchall()

    # Similar listings (same category, not same listing)
    similar = conn.execute('''
        SELECT l.id, l.title, l.category, l.image,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            l.auction_active, l.end_time
        FROM listings l WHERE l.category=? AND l.id!=? AND l.auction_active=1
        ORDER BY RANDOM() LIMIT 4
    ''', (row['category'], lid)).fetchall()

    uid = get_optional_user_id()
    ld = enrich(dict(row), conn, uid)
    conn.close()

    return jsonify({
        "listing": ld,
        "bids": [dict(b) for b in bids],
        "comments": [dict(c) for c in comments],
        "similar": [listing_time_left(dict(s)) for s in similar],
    }), 200


# ── CRUD ──────────────────────────────────────────────────────────────────────

@listings_bp.route('/', methods=['POST'])
@jwt_required()
def create_listing():
    user_id = int(get_jwt_identity())
    title = (request.form.get('title') or '').strip()
    category = request.form.get('category', '').strip()
    description = (request.form.get('description') or '').strip()
    starting_value = request.form.get('starting_value')
    end_time = request.form.get('end_time')
    condition = request.form.get('condition', 'Good')
    reserve_price = request.form.get('reserve_price') or None

    if not all([title, category, description, starting_value, end_time]):
        return jsonify({"error": "All fields are required"}), 400

    if 'T' in end_time:
        end_time = end_time.replace('T', ' ')
        if len(end_time) == 16:
            end_time += ':00'

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            image_filename = f"{uuid.uuid4().hex}.{ext}"
            file.save(os.path.join(current_app.root_path, 'media', 'images', image_filename))

    reserve_val = float(reserve_price) if reserve_price else None

    conn = get_db_connection()
    c = conn.execute('''
        INSERT INTO listings
          (user_id, title, category, description, starting_value, reserve_price, condition, end_time, image)
        VALUES (?,?,?,?,?,?,?,?,?)
    ''', (user_id, title, category, description, float(starting_value), reserve_val, condition, end_time, image_filename))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return jsonify({"message": "Listing created", "id": new_id}), 201


@listings_bp.route('/<int:lid>', methods=['DELETE'])
@jwt_required()
def delete_listing(lid):
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    listing = conn.execute('SELECT * FROM listings WHERE id=?', (lid,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    user = conn.execute('SELECT is_admin FROM users WHERE id=?', (user_id,)).fetchone()
    if listing['user_id'] != user_id and not user['is_admin']:
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
    conn.execute('DELETE FROM listings WHERE id=?', (lid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"}), 200


@listings_bp.route('/<int:lid>/close', methods=['POST'])
@jwt_required()
def close_auction(lid):
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    listing = conn.execute('SELECT * FROM listings WHERE id=?', (lid,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    user = conn.execute('SELECT is_admin FROM users WHERE id=?', (user_id,)).fetchone()
    if listing['user_id'] != user_id and not user['is_admin']:
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
    if not listing['auction_active']:
        conn.close()
        return jsonify({"error": "Already closed"}), 400
    top = conn.execute("SELECT user_id, value FROM bids WHERE listing_id=? ORDER BY value DESC LIMIT 1", (lid,)).fetchone()
    winner_id = top['user_id'] if top else None
    conn.execute("UPDATE listings SET auction_active=0, winner_id=? WHERE id=?", (winner_id, lid))
    if winner_id:
        create_notification(conn, winner_id, 'won',
                            'You won an auction!',
                            f'You won "{listing["title"]}" with a bid of ₹{top["value"]:,.0f}.',
                            f'/listings/{lid}')
    conn.commit()
    conn.close()
    return jsonify({"message": "Auction closed"}), 200


# ── Bid ───────────────────────────────────────────────────────────────────────

@listings_bp.route('/<int:lid>/bid', methods=['POST'])
@jwt_required()
def place_bid(lid):
    user_id = int(get_jwt_identity())
    data = request.json or {}
    try:
        amount = float(data.get('amount', 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    conn = get_db_connection()
    auto_close(conn)

    listing = conn.execute('SELECT * FROM listings WHERE id=?', (lid,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    if listing['user_id'] == user_id:
        conn.close()
        return jsonify({"error": "Cannot bid on your own listing"}), 400
    if not listing['auction_active']:
        conn.close()
        return jsonify({"error": "Auction has ended"}), 400

    prev_top = conn.execute(
        "SELECT user_id, value FROM bids WHERE listing_id=? ORDER BY value DESC LIMIT 1", (lid,)
    ).fetchone()
    floor = prev_top['value'] if prev_top else listing['starting_value']

    if amount <= floor:
        conn.close()
        return jsonify({"error": f"Bid must be above ₹{floor:,.0f}"}), 400

    conn.execute('INSERT INTO bids (user_id,listing_id,value) VALUES (?,?,?)', (user_id, lid, amount))

    # Outbid notification for previous top bidder
    if prev_top and prev_top['user_id'] != user_id:
        create_notification(conn, prev_top['user_id'], 'outbid',
                            "You've been outbid!",
                            f'Someone placed ₹{amount:,.0f} on "{listing["title"]}".',
                            f'/listings/{lid}')

    conn.commit()

    new_cur = conn.execute("SELECT MAX(value) AS m FROM bids WHERE listing_id=?", (lid,)).fetchone()['m']
    bid_count = conn.execute("SELECT COUNT(*) AS c FROM bids WHERE listing_id=?", (lid,)).fetchone()['c']
    reserve_met = listing['reserve_price'] is None or new_cur >= listing['reserve_price']
    conn.close()

    return jsonify({
        "message": "Bid placed!",
        "amount": amount,
        "current_price": new_cur,
        "bid_count": bid_count,
        "reserve_met": reserve_met,
    }), 201


# ── Watchlist toggle ──────────────────────────────────────────────────────────

@listings_bp.route('/<int:lid>/watch', methods=['POST'])
@jwt_required()
def toggle_watch(lid):
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    ex = conn.execute('SELECT id FROM watchlist WHERE user_id=? AND listing_id=?', (user_id, lid)).fetchone()
    if ex:
        conn.execute('DELETE FROM watchlist WHERE id=?', (ex['id'],))
        watched = False
        msg = "Removed from watchlist"
    else:
        conn.execute('INSERT INTO watchlist (user_id,listing_id) VALUES (?,?)', (user_id, lid))
        watched = True
        msg = "Added to watchlist"
    conn.commit()
    conn.close()
    return jsonify({"message": msg, "watched": watched}), 200


# ── Comments ──────────────────────────────────────────────────────────────────

@listings_bp.route('/<int:lid>/comments', methods=['POST'])
@jwt_required()
def add_comment(lid):
    user_id = int(get_jwt_identity())
    comment = (request.json.get('comment') or '').strip()
    if not comment:
        return jsonify({"error": "Empty comment"}), 400
    conn = get_db_connection()
    if not conn.execute('SELECT id FROM listings WHERE id=?', (lid,)).fetchone():
        conn.close()
        return jsonify({"error": "Not found"}), 404
    conn.execute('INSERT INTO comments (user_id,listing_id,comment) VALUES (?,?,?)', (user_id, lid, comment))
    conn.commit()
    new = conn.execute('''
        SELECT c.id, c.comment, c.created_at, u.username, u.profile_picture
        FROM comments c JOIN users u ON c.user_id=u.id
        WHERE c.listing_id=? ORDER BY c.created_at DESC LIMIT 1
    ''', (lid,)).fetchone()
    conn.close()
    return jsonify(dict(new)), 201


# ── Live state (polling) ──────────────────────────────────────────────────────

@listings_bp.route('/<int:lid>/live', methods=['GET'])
def live_state(lid):
    conn = get_db_connection()
    auto_close(conn)

    listing = conn.execute(
        'SELECT auction_active, end_time, reserve_price, starting_value FROM listings WHERE id=?', (lid,)
    ).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    agg = conn.execute("""
        SELECT COUNT(*) AS bid_count,
               COALESCE(MAX(value), ?) AS current_price
        FROM bids WHERE listing_id=?
    """, (listing['starting_value'], lid)).fetchone()

    top = conn.execute(
        "SELECT b.user_id, u.username FROM bids b JOIN users u ON b.user_id=u.id WHERE b.listing_id=? ORDER BY b.value DESC LIMIT 1",
        (lid,)
    ).fetchone()

    recent = conn.execute("""
        SELECT b.value, u.username, b.created_at
        FROM bids b JOIN users u ON b.user_id=u.id
        WHERE b.listing_id=? ORDER BY b.created_at DESC LIMIT 8
    """, (lid,)).fetchall()

    # Bidding war: 3+ bids in last 5 minutes (single connection, no leak)
    recent_count = conn.execute("""
        SELECT COUNT(*) AS c FROM bids
        WHERE listing_id=? AND created_at >= datetime('now', '-5 minutes')
    """, (lid,)).fetchone()['c']

    conn.close()

    time_left = 0
    if listing['end_time']:
        try:
            dt = datetime.strptime(listing['end_time'], '%Y-%m-%d %H:%M:%S')
            time_left = max(0, int((dt - datetime.now()).total_seconds()))
        except Exception:
            pass

    rp = listing['reserve_price']
    cp = agg['current_price']

    return jsonify({
        "bid_count": agg['bid_count'],
        "current_price": cp,
        "auction_active": bool(listing['auction_active']),
        "time_left_seconds": time_left,
        "top_bidder_id": top['user_id'] if top else None,
        "top_bidder": top['username'] if top else None,
        "reserve_met": rp is None or cp >= rp,
        "has_reserve": rp is not None,
        "bidding_war": recent_count >= 3,
        "recent_bids": [dict(b) for b in recent],
    }), 200


# ── User listings ─────────────────────────────────────────────────────────────

@listings_bp.route('/my', methods=['GET'])
@jwt_required()
def my_listings():
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    auto_close(conn)
    rows = conn.execute('''
        SELECT l.*,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l WHERE l.user_id=? ORDER BY l.created_at DESC
    ''', (user_id,)).fetchall()
    result = [enrich(dict(r), conn, user_id) for r in rows]
    conn.close()
    return jsonify(result), 200


@listings_bp.route('/won', methods=['GET'])
@jwt_required()
def won_listings():
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT l.*, u.username AS seller_name,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id
        WHERE l.winner_id=? AND l.auction_active=0 ORDER BY l.created_at DESC
    ''', (user_id,)).fetchall()
    result = [enrich(dict(r), conn, user_id) for r in rows]
    conn.close()
    return jsonify(result), 200
