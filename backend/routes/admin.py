from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection
from functools import wraps

admin_bp = Blueprint('admin', __name__)

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            user_id = get_jwt_identity()
            conn = get_db_connection()
            user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
            conn.close()
            if not user or not user['is_admin']:
                return jsonify({"error": "Admin access required"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

@admin_bp.route('/stats', methods=['GET'])
@admin_required()
def get_stats():
    conn = get_db_connection()
    
    stats = {}
    stats['total_users'] = conn.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').fetchone()['count']
    stats['total_listings'] = conn.execute('SELECT COUNT(*) as count FROM listings').fetchone()['count']
    stats['active_listings'] = conn.execute('SELECT COUNT(*) as count FROM listings WHERE auction_active = 1').fetchone()['count']
    stats['total_bids'] = conn.execute('SELECT COUNT(*) as count FROM bids').fetchone()['count']
    
    categories = conn.execute('''
        SELECT category, COUNT(*) as count 
        FROM listings 
        GROUP BY category
    ''').fetchall()
    stats['categories'] = [dict(c) for c in categories]
    
    monthly_bids = conn.execute('''
        SELECT strftime('%Y-%m', created_at) as month_val, COUNT(*) as count
        FROM bids
        GROUP BY month_val
        ORDER BY month_val ASC
    ''').fetchall()
    
    # Format month strings (e.g. "Jan 2026")
    from datetime import datetime
    formatted_monthly_bids = []
    for mb in monthly_bids:
        month_dt = datetime.strptime(mb['month_val'], '%Y-%m')
        formatted_monthly_bids.append({
            "month": month_dt.strftime('%b %Y'),
            "count": mb['count']
        })
    stats['monthly_bids'] = formatted_monthly_bids
    
    monthly_listings = conn.execute('''
        SELECT strftime('%Y-%m', created_at) as month_val, COUNT(*) as count
        FROM listings
        GROUP BY month_val
        ORDER BY month_val ASC
    ''').fetchall()
    
    formatted_monthly_listings = []
    for ml in monthly_listings:
        month_dt = datetime.strptime(ml['month_val'], '%Y-%m')
        formatted_monthly_listings.append({
            "month": month_dt.strftime('%b %Y'),
            "count": ml['count']
        })
    stats['monthly_listings'] = formatted_monthly_listings
    
    conn.close()
    return jsonify(stats), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users():
    conn = get_db_connection()
    users = conn.execute('SELECT id, username, email, is_admin, created_at, profile_picture FROM users ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users]), 200

@admin_bp.route('/users/<int:id>', methods=['DELETE'])
@admin_required()
def delete_user(id):
    conn = get_db_connection()
    c = conn.cursor()
    
    user = c.execute('SELECT is_admin FROM users WHERE id = ?', (id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
        
    if user['is_admin']:
        conn.close()
        return jsonify({"error": "Cannot delete admin users"}), 400
        
    c.execute('DELETE FROM users WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "User deleted successfully"}), 200

@admin_bp.route('/listings', methods=['GET'])
@admin_required()
def get_all_listings():
    conn = get_db_connection()
    listings = conn.execute('''
        SELECT l.*, u.username as seller_name,
            (SELECT COUNT(*) FROM bids WHERE listing_id = l.id) as bid_count
        FROM listings l
        JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
    ''').fetchall()
    conn.close()
    
    return jsonify([dict(l) for l in listings]), 200

@admin_bp.route('/listings/<int:id>/deactivate', methods=['POST'])
@admin_required()
def deactivate_listing(id):
    conn = get_db_connection()
    c = conn.cursor()
    
    listing = c.execute('SELECT auction_active FROM listings WHERE id = ?', (id,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Listing not found"}), 404
        
    if listing['auction_active'] == 0:
        conn.close()
        return jsonify({"error": "Listing is already deactivated"}), 400
        
    highest_bid = c.execute('''
        SELECT user_id FROM bids WHERE listing_id = ? ORDER BY value DESC LIMIT 1
    ''', (id,)).fetchone()
    
    winner_id = highest_bid['user_id'] if highest_bid else None
    
    c.execute('UPDATE listings SET auction_active = 0, winner_id = ? WHERE id = ?', (winner_id, id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Listing deactivated successfully"}), 200

@admin_bp.route('/listings/<int:id>', methods=['DELETE'])
@admin_required()
def delete_listing(id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('DELETE FROM listings WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Listing deleted successfully"}), 200
