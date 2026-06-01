import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database import get_db_connection

profile_bp = Blueprint('profile', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route('/', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    
    user = conn.execute('SELECT id, username, email, address, profile_picture, is_admin, created_at FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
        
    stats = {}
    stats['listings_created'] = conn.execute('SELECT COUNT(*) as count FROM listings WHERE user_id = ?', (user_id,)).fetchone()['count']
    stats['bids_placed'] = conn.execute('SELECT COUNT(*) as count FROM bids WHERE user_id = ?', (user_id,)).fetchone()['count']
    stats['auctions_won'] = conn.execute('SELECT COUNT(*) as count FROM listings WHERE winner_id = ?', (user_id,)).fetchone()['count']
    
    conn.close()
    
    user_dict = dict(user)
    user_dict['stats'] = stats
    
    return jsonify(user_dict), 200

@profile_bp.route('/', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    username = request.form.get('username')
    address = request.form.get('address')
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if username is taken by another user
    if username:
        existing = c.execute('SELECT id FROM users WHERE username = ? AND id != ?', (username, user_id)).fetchone()
        if existing:
            conn.close()
            return jsonify({"error": "Username is already taken"}), 400
            
    update_fields = []
    params = []
    
    if username:
        update_fields.append("username = ?")
        params.append(username)
    if address is not None: # Can be empty string
        update_fields.append("address = ?")
        params.append(address)
        
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and file.filename != '' and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            image_filename = f"{uuid.uuid4().hex}.{ext}"
            filepath = os.path.join(current_app.root_path, 'media', 'images', image_filename)
            file.save(filepath)
            update_fields.append("profile_picture = ?")
            params.append(image_filename)
            
    if update_fields:
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        params.append(user_id)
        c.execute(query, tuple(params))
        conn.commit()
        
    conn.close()
    return jsonify({"message": "Profile updated successfully"}), 200
