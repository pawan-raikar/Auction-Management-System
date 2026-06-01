import random
import bcrypt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from app import mail
from database import get_db_connection

auth_bp = Blueprint('auth', __name__)

def generate_otp():
    return random.randint(100000, 999999)

def send_otp_email(email, otp, is_reset=False):
    def send_async_email(app, msg):
        with app.app_context():
            try:
                mail.send(msg)
            except Exception as e:
                print("Mail error:", e)

    import threading
    subject = "AuctionEdge Password Reset OTP" if is_reset else "AuctionEdge Registration OTP"
    msg = Message(subject, recipients=[email])
    msg.body = f"Your OTP is: {otp}. It is valid for 10 minutes."
    
    app = current_app._get_current_object()
    thread = threading.Thread(target=send_async_email, args=(app, msg))
    thread.start()
    return True

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password required"}), 400

    conn = get_db_connection()
    c = conn.cursor()

    # Check if user exists
    user = c.execute('SELECT * FROM users WHERE email = ? OR username = ?', (email, username)).fetchone()
    if user:
        conn.close()
        return jsonify({"error": "User with this email or username already exists"}), 400

    otp = generate_otp()
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    c.execute('''
        INSERT INTO otp_verifications (email, otp, username, password_hash)
        VALUES (?, ?, ?, ?)
    ''', (email, otp, username, hashed_pw))
    conn.commit()
    conn.close()

    # In a real app with SMTP set up, we send the email.
    print(f"OTP for {email}: {otp}", flush=True)
    send_otp_email(email, otp)
    
    return jsonify({
        "message": f"OTP sent! If blocked by ISP, your Dev OTP is: {otp}", 
        "dev_otp": otp
    }), 201


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({"error": "Email and OTP required"}), 400

    conn = get_db_connection()
    c = conn.cursor()

    # Get valid OTPs (less than 10 mins old)
    ten_mins_ago = (datetime.now() - timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
    verification = c.execute('''
        SELECT * FROM otp_verifications
        WHERE email = ? AND otp = ? AND created_at >= ?
        ORDER BY created_at DESC LIMIT 1
    ''', (email, otp, ten_mins_ago)).fetchone()

    if not verification:
        conn.close()
        return jsonify({"error": "Invalid or expired OTP"}), 400

    # OTP valid, create user
    username = verification['username']
    password_hash = verification['password_hash']

    try:
        c.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, password_hash))
        user_id = c.lastrowid
        
        # Delete OTP record
        c.execute('DELETE FROM otp_verifications WHERE email = ?', (email,))
        conn.commit()

        user = c.execute('SELECT id, username, email, is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        user_dict = dict(user)

        access_token = create_access_token(identity=user_id)
        conn.close()
        return jsonify({
            "message": "Registration successful",
            "access_token": access_token,
            "user": user_dict
        }), 200

    except Exception as e:
        conn.close()
        return jsonify({"error": "Error creating user"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401
    
    if user['is_active'] == 0:
        return jsonify({"error": "Account deactivated"}), 403

    access_token = create_access_token(identity=user['id'])
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "profile_picture": user['profile_picture'],
            "is_admin": bool(user['is_admin'])
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    user = conn.execute('SELECT id, username, email, address, profile_picture, is_admin, created_at FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    user_dict = dict(user)
    user_dict['is_admin'] = bool(user_dict['is_admin'])
    return jsonify(user_dict), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    
    if not user:
        conn.close()
        # Don't reveal user existence, but for now we can just say "OTP sent"
        return jsonify({"message": f"If an account exists, an OTP was sent to {email}"}), 200

    otp = generate_otp()
    conn.execute('''
        INSERT INTO password_reset_otps (email, otp)
        VALUES (?, ?)
    ''', (email, otp))
    conn.commit()
    conn.close()

    print(f"Password reset OTP for {email}: {otp}")
    send_otp_email(email, otp, is_reset=True)

    return jsonify({"message": f"OTP sent to {email}"}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    new_password = data.get('new_password')

    if not all([email, otp, new_password]):
        return jsonify({"error": "Email, OTP, and new password required"}), 400

    conn = get_db_connection()
    
    ten_mins_ago = (datetime.now() - timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
    reset_record = conn.execute('''
        SELECT * FROM password_reset_otps
        WHERE email = ? AND otp = ? AND created_at >= ?
        ORDER BY created_at DESC LIMIT 1
    ''', (email, otp, ten_mins_ago)).fetchone()

    if not reset_record:
        conn.close()
        return jsonify({"error": "Invalid or expired OTP"}), 400

    hashed_pw = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', (hashed_pw, email))
    conn.execute('DELETE FROM password_reset_otps WHERE email = ?', (email,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Password updated successfully"}), 200
