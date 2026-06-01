import random
import threading
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


def _send_async(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            print(f"[Mail error] {e}", flush=True)


def send_otp_email(to, otp, subject, body_line):
    msg = Message(subject, recipients=[to])
    # Logo SVG paths (same as app navbar icon)
    logo_svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" '
        'fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M14 13L3 22h10l7-7"/>'
        '<path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/>'
        '</svg>'
    )
    otp_digits = ''.join(
        f'<td style="width:44px;height:52px;background:#0e1018;border:1px solid rgba(99,102,241,0.35);'
        f'border-radius:8px;text-align:center;vertical-align:middle;'
        f'font-size:26px;font-weight:700;color:#f1f5f9;font-family:Courier New,monospace;letter-spacing:0;">'
        f'{d}</td>'
        f'<td style="width:6px;"></td>'
        for d in str(otp)
    )

    msg.html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#030507;font-family:Inter,Segoe UI,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#030507;padding:32px 16px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#07080e;border-radius:16px;border:1px solid rgba(99,102,241,0.2);overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:28px 32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="width:40px;height:40px;background:#6366f1;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                  {logo_svg}
                </div>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <span style="color:#f1f5f9;font-size:1.25rem;font-weight:800;letter-spacing:-0.5px;">AuctionEdge</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 32px 24px;">
          <p style="margin:0 0 6px;color:#94a3b8;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
            One-Time Password
          </p>
          <p style="margin:0 0 24px;color:#e2e8f0;font-size:1rem;line-height:1.65;">
            {body_line}
          </p>

          <!-- OTP digits -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr>
              {otp_digits}
            </tr>
          </table>

          <!-- Expiry notice -->
          <table cellpadding="0" cellspacing="0" width="100%"
            style="background:#0c0e18;border:1px solid rgba(99,102,241,0.15);border-radius:10px;">
            <tr>
              <td style="padding:14px 18px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px;vertical-align:top;">
                      <div style="width:20px;height:20px;background:rgba(99,102,241,0.15);border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#6366f1;">&#9432;</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#64748b;font-size:0.8rem;line-height:1.5;">
                        This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.
                        Never share it with anyone — AuctionEdge staff will never ask for your OTP.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#334155;font-size:0.75rem;text-align:center;line-height:1.6;">
            This email was sent by <strong style="color:#475569;">AuctionEdge</strong>.
            If you did not request this, you can safely ignore it.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""
    app = current_app._get_current_object()
    threading.Thread(target=_send_async, args=(app, msg)).start()


# ── Login — direct email + password ──────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.json or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user['is_active']:
        return jsonify({"error": "Account suspended. Contact admin."}), 403

    token = create_access_token(identity=str(user['id']))
    return jsonify({
        "access_token": token,
        "user": {
            "id":              user['id'],
            "username":        user['username'],
            "email":           user['email'],
            "profile_picture": user['profile_picture'],
            "is_admin":        bool(user['is_admin']),
        }
    }), 200


# ── Registration — step 1: send OTP ──────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.json or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db_connection()
    if conn.execute('SELECT id FROM users WHERE email=? OR username=?', (email, username)).fetchone():
        conn.close()
        return jsonify({"error": "Email or username already in use"}), 400

    otp    = generate_otp()
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    # Store created_at explicitly in UTC so cutoff comparison is consistent
    now_utc = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    conn.execute('DELETE FROM otp_verifications WHERE email=?', (email,))
    conn.execute(
        'INSERT INTO otp_verifications (email,otp,username,password_hash,created_at) VALUES (?,?,?,?,?)',
        (email, otp, username, hashed, now_utc)
    )
    conn.commit()
    conn.close()

    print(f"[OTP] Register OTP for {email}: {otp}", flush=True)
    send_otp_email(
        email, otp,
        "AuctionEdge — Verify Your Email",
        f"Hi <strong>{username}</strong>, here is your one-time verification code to complete your AuctionEdge registration."
    )
    return jsonify({"message": "OTP sent to your email"}), 201


# ── Registration — step 2: verify OTP ────────────────────────────────────────

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data  = request.json or {}
    email = (data.get('email') or '').strip().lower()
    otp   = data.get('otp')

    if not email or otp is None:
        return jsonify({"error": "Email and OTP required"}), 400

    conn = get_db_connection()
    # Use utcnow() — SQLite CURRENT_TIMESTAMP stores UTC
    cutoff = (datetime.utcnow() - timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
    rec = conn.execute(
        'SELECT * FROM otp_verifications WHERE email=? AND otp=? AND created_at>=? ORDER BY created_at DESC LIMIT 1',
        (email, int(otp), cutoff)
    ).fetchone()

    if not rec:
        conn.close()
        return jsonify({"error": "Invalid or expired OTP"}), 400

    try:
        conn.execute('INSERT INTO users (username,email,password_hash) VALUES (?,?,?)',
                     (rec['username'], email, rec['password_hash']))
        uid = conn.execute('SELECT last_insert_rowid() AS id').fetchone()['id']
        conn.execute('DELETE FROM otp_verifications WHERE email=?', (email,))
        conn.commit()
        user  = conn.execute('SELECT id,username,email,is_admin,profile_picture FROM users WHERE id=?', (uid,)).fetchone()
        token = create_access_token(identity=str(uid))
        conn.close()
        return jsonify({"message": "Welcome to AuctionEdge!", "access_token": token, "user": dict(user)}), 200
    except Exception:
        conn.close()
        return jsonify({"error": "Registration failed. Try again."}), 500


# ── Session ───────────────────────────────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    uid  = int(get_jwt_identity())
    conn = get_db_connection()
    user = conn.execute(
        'SELECT id,username,email,address,bio,profile_picture,is_admin,is_active,created_at FROM users WHERE id=?', (uid,)
    ).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "Not found"}), 404
    u = dict(user)
    u['is_admin'] = bool(u['is_admin'])
    return jsonify(u), 200


# ── Forgot password — send OTP ────────────────────────────────────────────────

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.json or {}
    email = (data.get('email') or '').strip().lower()
    conn  = get_db_connection()
    user  = conn.execute('SELECT id,username FROM users WHERE email=?', (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"message": "If that email exists, an OTP was sent"}), 200

    otp     = generate_otp()
    now_utc = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    conn.execute('DELETE FROM password_reset_otps WHERE email=?', (email,))
    conn.execute('INSERT INTO password_reset_otps (email,otp,created_at) VALUES (?,?,?)', (email, otp, now_utc))
    conn.commit()
    conn.close()

    print(f"[OTP] Password reset OTP for {email}: {otp}", flush=True)
    send_otp_email(
        email, otp,
        "AuctionEdge — Reset Your Password",
        f"Hi <strong>{user['username']}</strong>, use this code to reset your AuctionEdge password."
    )
    return jsonify({"message": f"OTP sent to {email}"}), 200


# ── Reset password — verify OTP + set new password ───────────────────────────

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data   = request.json or {}
    email  = (data.get('email') or '').strip().lower()
    otp    = data.get('otp')
    new_pw = data.get('new_password') or ''

    if not email or otp is None or not new_pw:
        return jsonify({"error": "All fields required"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn   = get_db_connection()
    # Use utcnow() consistently
    cutoff = (datetime.utcnow() - timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
    rec    = conn.execute(
        'SELECT * FROM password_reset_otps WHERE email=? AND otp=? AND created_at>=? ORDER BY created_at DESC LIMIT 1',
        (email, int(otp), cutoff)
    ).fetchone()

    if not rec:
        conn.close()
        return jsonify({"error": "Invalid or expired OTP"}), 400

    hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    conn.execute('UPDATE users SET password_hash=? WHERE email=?', (hashed, email))
    conn.execute('DELETE FROM password_reset_otps WHERE email=?', (email,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Password updated successfully"}), 200
