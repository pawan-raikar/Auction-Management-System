from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from database import get_db_connection
from datetime import datetime

admin_bp = Blueprint('admin', __name__)


def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def inner(*args, **kwargs):
            uid = int(get_jwt_identity())
            conn = get_db_connection()
            u = conn.execute('SELECT is_admin FROM users WHERE id=?', (uid,)).fetchone()
            conn.close()
            if not u or not u['is_admin']:
                return jsonify({"error": "Admin access required"}), 403
            return fn(*args, **kwargs)
        return inner
    return wrapper


# â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@admin_bp.route('/stats', methods=['GET'])
@admin_required()
def stats():
    conn = get_db_connection()

    total_users     = conn.execute("SELECT COUNT(*) AS c FROM users WHERE is_admin=0").fetchone()['c']
    active_users    = conn.execute("SELECT COUNT(*) AS c FROM users WHERE is_admin=0 AND is_active=1").fetchone()['c']
    suspended_users = conn.execute("SELECT COUNT(*) AS c FROM users WHERE is_admin=0 AND is_active=0").fetchone()['c']
    total_listings  = conn.execute("SELECT COUNT(*) AS c FROM listings").fetchone()['c']
    active_listings = conn.execute("SELECT COUNT(*) AS c FROM listings WHERE auction_active=1").fetchone()['c']
    ended_listings  = conn.execute("SELECT COUNT(*) AS c FROM listings WHERE auction_active=0").fetchone()['c']
    total_bids      = conn.execute("SELECT COUNT(*) AS c FROM bids").fetchone()['c']
    featured_count  = conn.execute("SELECT COUNT(*) AS c FROM listings WHERE is_featured=1 AND auction_active=1").fetchone()['c']

    # Total revenue = sum of winning bids on ended auctions
    revenue = conn.execute("""
        SELECT COALESCE(SUM(b.value),0) AS total
        FROM bids b
        JOIN listings l ON b.listing_id=l.id
        WHERE l.auction_active=0 AND l.winner_id=b.user_id
    """).fetchone()['total']

    categories = conn.execute(
        "SELECT category, COUNT(*) AS count FROM listings GROUP BY category ORDER BY count DESC"
    ).fetchall()

    monthly_bids = conn.execute("""
        SELECT strftime('%Y-%m', created_at) AS month_val, COUNT(*) AS count
        FROM bids GROUP BY month_val ORDER BY month_val ASC
    """).fetchall()

    monthly_listings = conn.execute("""
        SELECT strftime('%Y-%m', created_at) AS month_val, COUNT(*) AS count
        FROM listings GROUP BY month_val ORDER BY month_val ASC
    """).fetchall()

    def fmt_month(rows):
        result = []
        for r in rows:
            try:
                dt = datetime.strptime(r['month_val'], '%Y-%m')
                result.append({"month": dt.strftime('%b %Y'), "count": r['count']})
            except Exception:
                pass
        return result

    # Top bidders
    top_bidders = conn.execute("""
        SELECT u.username, COUNT(*) AS bid_count, MAX(b.value) AS max_bid
        FROM bids b JOIN users u ON b.user_id=u.id
        GROUP BY b.user_id ORDER BY bid_count DESC LIMIT 5
    """).fetchall()

    conn.close()
    return jsonify({
        "total_users": total_users,
        "active_users": active_users,
        "suspended_users": suspended_users,
        "total_listings": total_listings,
        "active_listings": active_listings,
        "ended_listings": ended_listings,
        "total_bids": total_bids,
        "featured_count": featured_count,
        "total_revenue": round(revenue),
        "categories": [dict(r) for r in categories],
        "monthly_bids": fmt_month(monthly_bids),
        "monthly_listings": fmt_month(monthly_listings),
        "top_bidders": [dict(r) for r in top_bidders],
    }), 200


# â”€â”€ User Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users():
    conn = get_db_connection()
    users = conn.execute("""
        SELECT u.id, u.username, u.email, u.is_admin, u.is_active, u.created_at,
               (SELECT COUNT(*) FROM listings WHERE user_id=u.id) AS listing_count,
               (SELECT COUNT(*) FROM bids WHERE user_id=u.id) AS bid_count,
               (SELECT COUNT(*) FROM listings WHERE winner_id=u.id) AS auctions_won
        FROM users u ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(u) for u in users]), 200


@admin_bp.route('/users/<int:uid>/status', methods=['PUT'])
@admin_required()
def toggle_user_status(uid):
    """Suspend or reactivate a user."""
    conn = get_db_connection()
    user = conn.execute('SELECT id, is_admin, is_active FROM users WHERE id=?', (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    if user['is_admin']:
        conn.close()
        return jsonify({"error": "Cannot modify admin users"}), 403
    new_status = 0 if user['is_active'] else 1
    conn.execute('UPDATE users SET is_active=? WHERE id=?', (new_status, uid))
    conn.commit()
    conn.close()
    action = "activated" if new_status else "suspended"
    return jsonify({"message": f"User {action}", "is_active": bool(new_status)}), 200


@admin_bp.route('/users/<int:uid>/make-admin', methods=['PUT'])
@admin_required()
def make_admin(uid):
    """Promote/demote a user to/from admin."""
    data = request.json or {}
    is_admin = int(bool(data.get('is_admin', True)))
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE id=?', (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    conn.execute('UPDATE users SET is_admin=? WHERE id=?', (is_admin, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": f"User {'promoted to' if is_admin else 'removed from'} admin"}), 200


@admin_bp.route('/users/<int:uid>', methods=['DELETE'])
@admin_required()
def delete_user(uid):
    conn = get_db_connection()
    user = conn.execute('SELECT is_admin FROM users WHERE id=?', (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    if user['is_admin']:
        conn.close()
        return jsonify({"error": "Cannot delete admin users"}), 403
    conn.execute('DELETE FROM users WHERE id=?', (uid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "User deleted"}), 200


# â”€â”€ Listing Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@admin_bp.route('/listings', methods=['GET'])
@admin_required()
def get_listings():
    conn = get_db_connection()
    listings = conn.execute("""
        SELECT l.*, u.username AS seller_name,
               (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
               COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM listings l JOIN users u ON l.user_id=u.id
        ORDER BY l.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(l) for l in listings]), 200


@admin_bp.route('/listings/<int:lid>/feature', methods=['PUT'])
@admin_required()
def toggle_featured(lid):
    """Feature or unfeature a listing."""
    conn = get_db_connection()
    listing = conn.execute('SELECT id, is_featured FROM listings WHERE id=?', (lid,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    new_val = 0 if listing['is_featured'] else 1
    conn.execute('UPDATE listings SET is_featured=? WHERE id=?', (new_val, lid))
    conn.commit()
    conn.close()
    return jsonify({"message": f"Listing {'featured' if new_val else 'unfeatured'}", "is_featured": bool(new_val)}), 200


@admin_bp.route('/listings/<int:lid>/close', methods=['POST'])
@admin_required()
def force_close(lid):
    conn = get_db_connection()
    listing = conn.execute('SELECT * FROM listings WHERE id=?', (lid,)).fetchone()
    if not listing:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    if not listing['auction_active']:
        conn.close()
        return jsonify({"error": "Already closed"}), 400
    top = conn.execute("SELECT user_id FROM bids WHERE listing_id=? ORDER BY value DESC LIMIT 1", (lid,)).fetchone()
    conn.execute("UPDATE listings SET auction_active=0, winner_id=? WHERE id=?",
                 (top['user_id'] if top else None, lid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Auction force-closed"}), 200


@admin_bp.route('/listings/<int:lid>', methods=['DELETE'])
@admin_required()
def delete_listing(lid):
    conn = get_db_connection()
    conn.execute('DELETE FROM listings WHERE id=?', (lid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Listing deleted"}), 200


# â”€â”€ Bid Activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@admin_bp.route('/bids', methods=['GET'])
@admin_required()
def get_all_bids():
    conn = get_db_connection()
    bids = conn.execute("""
        SELECT b.id, b.value, b.created_at,
               u.username AS bidder, u.email AS bidder_email,
               l.title AS listing_title, l.id AS listing_id,
               l.auction_active
        FROM bids b
        JOIN users u ON b.user_id=u.id
        JOIN listings l ON b.listing_id=l.id
        ORDER BY b.created_at DESC LIMIT 200
    """).fetchall()
    conn.close()
    return jsonify([dict(b) for b in bids]), 200

