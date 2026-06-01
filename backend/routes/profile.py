import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection

profile_bp = Blueprint('profile', __name__)
ALLOWED = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed(fn):
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in ALLOWED


@profile_bp.route('/', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    conn = get_db_connection()

    user = conn.execute(
        'SELECT id, username, email, address, bio, profile_picture, is_admin, created_at FROM users WHERE id=?',
        (user_id,)
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    stats = {
        'listings_created': conn.execute('SELECT COUNT(*) AS c FROM listings WHERE user_id=?', (user_id,)).fetchone()['c'],
        'bids_placed': conn.execute('SELECT COUNT(*) AS c FROM bids WHERE user_id=?', (user_id,)).fetchone()['c'],
        'auctions_won': conn.execute('SELECT COUNT(*) AS c FROM listings WHERE winner_id=?', (user_id,)).fetchone()['c'],
        'watchlist_count': conn.execute('SELECT COUNT(*) AS c FROM watchlist WHERE user_id=?', (user_id,)).fetchone()['c'],
    }
    conn.close()

    u = dict(user)
    u['is_admin'] = bool(u['is_admin'])
    u['stats'] = stats
    return jsonify(u), 200


@profile_bp.route('/', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    username = (request.form.get('username') or '').strip()
    address = request.form.get('address', '')
    bio = request.form.get('bio', '')

    conn = get_db_connection()
    c = conn.cursor()

    if username:
        taken = c.execute('SELECT id FROM users WHERE username=? AND id!=?', (username, user_id)).fetchone()
        if taken:
            conn.close()
            return jsonify({"error": "Username already taken"}), 400

    fields, params = [], []

    if username:
        fields.append("username=?")
        params.append(username)
    if address is not None:
        fields.append("address=?")
        params.append(address)
    if bio is not None:
        fields.append("bio=?")
        params.append(bio)

    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and file.filename and allowed(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            fname = f"{uuid.uuid4().hex}.{ext}"
            file.save(os.path.join(current_app.root_path, 'media', 'images', fname))
            fields.append("profile_picture=?")
            params.append(fname)

    if fields:
        params.append(user_id)
        c.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=?", tuple(params))
        conn.commit()

    conn.close()
    return jsonify({"message": "Profile updated"}), 200

