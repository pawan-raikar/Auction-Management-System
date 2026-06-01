import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
from database import get_db_connection

listings_bp = Blueprint('listings', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def auto_close_auctions(conn):
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    c = conn.cursor()
    # Find all active auctions that have ended
    expired = c.execute('''
        SELECT id FROM listings 
        WHERE auction_active = 1 AND end_time IS NOT NULL AND end_time < ?
    ''', (now,)).fetchall()
    
    for row in expired:
        listing_id = row['id']
        # Find highest bid
        highest_bid = c.execute('''
            SELECT user_id FROM bids WHERE listing_id = ? ORDER BY value DESC LIMIT 1
        ''', (listing_id,)).fetchone()
        
        winner_id = highest_bid['user_id'] if highest_bid else None
        
        c.execute('''
            UPDATE listings SET auction_active = 0, winner_id = ? WHERE id = ?
        ''', (winner_id, listing_id))
    
    if expired:
        conn.commit()


@listings_bp.route('/', methods=['GET'])
def get_listings():
    conn = get_db_connection()
    auto_close_auctions(conn)
    
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    status = request.args.get('status', '') # active, ended
    sort = request.args.get('sort', 'newest')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')

    query = '''
        SELECT l.*, 
            (SELECT COUNT(*) FROM bids WHERE listing_id = l.id) as bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id = l.id), l.starting_value) as current_price
        FROM listings l
        WHERE 1=1
    '''
    params = []

    if search:
        query += ' AND (l.title LIKE ? OR l.description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    if category:
        query += ' AND l.category = ?'
        params.append(category)
    if status == 'active':
        query += ' AND l.auction_active = 1'
    elif status == 'ended':
        query += ' AND l.auction_active = 0'

    # Using a CTE or subquery for price filtering is better but we can just filter it here
    query = f'''
        SELECT * FROM ({query}) as res WHERE 1=1
    '''
    
    if min_price:
        query += ' AND current_price >= ?'
        params.append(float(min_price))
    if max_price:
        query += ' AND current_price <= ?'
        params.append(float(max_price))

    if sort == 'newest':
        query += ' ORDER BY created_at DESC'
    elif sort == 'price_asc':
        query += ' ORDER BY current_price ASC'
    elif sort == 'price_desc':
        query += ' ORDER BY current_price DESC'
    elif sort == 'ending_soon':
        query += ' ORDER BY CASE WHEN auction_active = 1 THEN end_time ELSE "9999-12-31" END ASC'

    listings = conn.execute(query, params).fetchall()
    
    # Check if user is logged in to get watch status
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except:
        pass

    result = []
    for l in listings:
        ldict = dict(l)
        ldict['is_watched'] = False
        if user_id:
            watched = conn.execute('SELECT 1 FROM watchlist WHERE user_id = ? AND listing_id = ?', (user_id, ldict['id'])).fetchone()
            ldict['is_watched'] = bool(watched)
            
        if ldict['end_time']:
            end_time_dt = datetime.strptime(ldict['end_time'], '%Y-%m-%d %H:%M:%S')
            time_left = (end_time_dt - datetime.now()).total_seconds()
            ldict['time_left_seconds'] = max(0, int(time_left))
        else:
            ldict['time_left_seconds'] = 0
            
        result.append(ldict)

    conn.close()
    # Mock pagination for now
    return jsonify({
        "listings": result,
        "total": len(result)
    }), 200


@listings_bp.route('/', methods=['POST'])
@jwt_required()
def create_listing():
    user_id = get_jwt_identity()
    title = request.form.get('title')
    category = request.form.get('category')
    description = request.form.get('description')
    starting_value = request.form.get('starting_value')
    end_time = request.form.get('end_time') # Expected format 'YYYY-MM-DD HH:MM:SS'
    
    if not all([title, category, description, starting_value, end_time]):
        return jsonify({"error": "Missing required fields"}), 400

    # Format end_time if it comes from datetime-local input (YYYY-MM-DDTHH:MM)
    if 'T' in end_time:
        end_time = end_time.replace('T', ' ')
        if len(end_time) == 16: # Missing seconds
            end_time += ':00'

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            image_filename = f"{uuid.uuid4().hex}.{ext}"
            filepath = os.path.join(current_app.root_path, 'media', 'images', image_filename)
            file.save(filepath)

    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO listings (user_id, title, category, description, starting_value, end_time, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, title, category, description, float(starting_value), end_time, image_filename))
    conn.commit()
    new_id = c.lastrowid
    conn.close()

    return jsonify({"message": "Listing created", "id": new_id}), 201


@listings_bp.route('/<int:id>', methods=['GET'])
def get_listing(id):
    conn = get_db_connection()
    auto_close_auctions(conn)

    listing = conn.execute('''
        SELECT l.*, u.username as seller_name,
            (SELECT COUNT(*) FROM watchlist WHERE listing_id = l.id) as watcher_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id = l.id), l.starting_value) as current_price
        FROM listings l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?
    ''', (id,)).fetchone()

    if not listing:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404

    bids = conn.execute('''
        SELECT b.*, u.username 
        FROM bids b 
        JOIN users u ON b.user_id = u.id 
        WHERE b.listing_id = ? 
        ORDER BY b.value DESC
    ''', (id,)).fetchall()

    comments = conn.execute('''
        SELECT c.*, u.username, u.profile_picture
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.listing_id = ? 
        ORDER BY c.created_at DESC
    ''', (id,)).fetchall()

    ldict = dict(listing)
    
    if ldict['end_time']:
        end_time_dt = datetime.strptime(ldict['end_time'], '%Y-%m-%d %H:%M:%S')
        time_left = (end_time_dt - datetime.now()).total_seconds()
        ldict['time_left_seconds'] = max(0, int(time_left))
    else:
        ldict['time_left_seconds'] = 0

    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except:
        pass
    
    ldict['is_watched'] = False
    if user_id:
        watched = conn.execute('SELECT 1 FROM watchlist WHERE user_id = ? AND listing_id = ?', (user_id, id)).fetchone()
        ldict['is_watched'] = bool(watched)

    conn.close()

    return jsonify({
        "listing": ldict,
        "bids": [dict(b) for b in bids],
        "comments": [dict(c) for c in comments]
    }), 200


@listings_bp.route('/<int:id>/bid', methods=['POST'])
@jwt_required()
def place_bid(id):
    user_id = get_jwt_identity()
    amount = request.json.get('amount')
    
    if amount is None:
        return jsonify({"error": "Amount is required"}), 400
    
    amount = float(amount)

    conn = get_db_connection()
    c = conn.cursor()
    
    auto_close_auctions(conn)

    listing = c.execute('SELECT * FROM listings WHERE id = ?', (id,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404

    if listing['user_id'] == user_id:
        conn.close()
        return jsonify({"error": "You cannot bid on your own listing"}), 400

    if listing['auction_active'] == 0:
        conn.close()
        return jsonify({"error": "Auction is closed"}), 400

    highest_bid = c.execute('SELECT MAX(value) as max_val FROM bids WHERE listing_id = ?', (id,)).fetchone()
    current_price = highest_bid['max_val'] if highest_bid['max_val'] else listing['starting_value']

    if amount <= current_price:
        conn.close()
        return jsonify({"error": f"Bid must be greater than current price ({current_price})"}), 400

    c.execute('INSERT INTO bids (user_id, listing_id, value) VALUES (?, ?, ?)', (user_id, id, amount))
    conn.commit()
    conn.close()

    return jsonify({"message": "Bid placed successfully"}), 201


@listings_bp.route('/<int:id>/close', methods=['POST'])
@jwt_required()
def close_auction(id):
    user_id = get_jwt_identity()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    listing = c.execute('SELECT * FROM listings WHERE id = ?', (id,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404

    # Allow seller or admin to close
    user = c.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if listing['user_id'] != user_id and not user['is_admin']:
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403

    if listing['auction_active'] == 0:
        conn.close()
        return jsonify({"error": "Auction already closed"}), 400

    highest_bid = c.execute('''
        SELECT user_id FROM bids WHERE listing_id = ? ORDER BY value DESC LIMIT 1
    ''', (id,)).fetchone()
    
    winner_id = highest_bid['user_id'] if highest_bid else None
    
    c.execute('UPDATE listings SET auction_active = 0, winner_id = ? WHERE id = ?', (winner_id, id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Auction closed successfully"}), 200


@listings_bp.route('/<int:id>/watch', methods=['POST'])
@jwt_required()
def toggle_watch(id):
    user_id = get_jwt_identity()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    existing = c.execute('SELECT id FROM watchlist WHERE user_id = ? AND listing_id = ?', (user_id, id)).fetchone()
    
    if existing:
        c.execute('DELETE FROM watchlist WHERE id = ?', (existing['id'],))
        msg = "Removed from watchlist"
    else:
        c.execute('INSERT INTO watchlist (user_id, listing_id) VALUES (?, ?)', (user_id, id))
        msg = "Added to watchlist"
        
    conn.commit()
    conn.close()
    
    return jsonify({"message": msg}), 200


@listings_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_listing(id):
    user_id = get_jwt_identity()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    listing = c.execute('SELECT * FROM listings WHERE id = ?', (id,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404
        
    user = c.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if listing['user_id'] != user_id and not user['is_admin']:
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
        
    c.execute('DELETE FROM listings WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Listing deleted successfully"}), 200


@listings_bp.route('/<int:id>/comments', methods=['POST'])
@jwt_required()
def add_comment(id):
    user_id = get_jwt_identity()
    comment = request.json.get('comment')
    
    if not comment:
        return jsonify({"error": "Comment is required"}), 400
        
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO comments (user_id, listing_id, comment) VALUES (?, ?, ?)', (user_id, id, comment))
    conn.commit()
    new_id = c.lastrowid
    
    new_comment = c.execute('''
        SELECT c.*, u.username, u.profile_picture 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.id = ?
    ''', (new_id,)).fetchone()
    
    conn.close()
    
    return jsonify(dict(new_comment)), 201
