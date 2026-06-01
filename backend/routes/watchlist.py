from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection
from routes.listings import auto_close_auctions
from datetime import datetime

watchlist_bp = Blueprint('watchlist', __name__)

@watchlist_bp.route('/', methods=['GET'])
@jwt_required()
def get_watchlist():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    auto_close_auctions(conn)
    
    query = '''
        SELECT l.*, 
            (SELECT COUNT(*) FROM bids WHERE listing_id = l.id) as bid_count,
            COALESCE((SELECT MAX(value) FROM bids WHERE listing_id = l.id), l.starting_value) as current_price
        FROM watchlist w
        JOIN listings l ON w.listing_id = l.id
        WHERE w.user_id = ?
        ORDER BY w.id DESC
    '''
    
    listings = conn.execute(query, (user_id,)).fetchall()
    
    result = []
    for l in listings:
        ldict = dict(l)
        ldict['is_watched'] = True
        if ldict['end_time']:
            end_time_dt = datetime.strptime(ldict['end_time'], '%Y-%m-%d %H:%M:%S')
            time_left = (end_time_dt - datetime.now()).total_seconds()
            ldict['time_left_seconds'] = max(0, int(time_left))
        else:
            ldict['time_left_seconds'] = 0
        result.append(ldict)
        
    conn.close()
    
    return jsonify(result), 200
