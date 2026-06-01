from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection
from routes.listings import auto_close, listing_time_left

watchlist_bp = Blueprint('watchlist', __name__)


@watchlist_bp.route('/', methods=['GET'])
@jwt_required()
def get_watchlist():
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    auto_close(conn)

    listings = conn.execute('''
        SELECT l.*,
            (SELECT COUNT(*) FROM bids WHERE listing_id=l.id) AS bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id=l.id), l.starting_value) AS current_price
        FROM watchlist w
        JOIN listings l ON w.listing_id=l.id
        WHERE w.user_id=?
        ORDER BY w.id DESC
    ''', (user_id,)).fetchall()

    result = []
    for l in listings:
        ld = listing_time_left(dict(l))
        ld['is_watched'] = True
        result.append(ld)

    conn.close()
    return jsonify(result), 200

