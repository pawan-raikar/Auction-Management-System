from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection

notifications_bp = Blueprint('notifications', __name__)


def create_notification(conn, user_id, ntype, title, body, link=None):
    conn.execute(
        'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
        (user_id, ntype, title, body, link)
    )


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    uid = int(get_jwt_identity())
    conn = get_db_connection()
    rows = conn.execute(
        'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
        (uid,)
    ).fetchall()
    unread = conn.execute(
        'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0', (uid,)
    ).fetchone()['c']
    conn.close()
    return jsonify({"notifications": [dict(r) for r in rows], "unread_count": unread}), 200


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    uid = int(get_jwt_identity())
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET is_read=1 WHERE user_id=?', (uid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "All marked as read"}), 200


@notifications_bp.route('/<int:nid>/read', methods=['PUT'])
@jwt_required()
def mark_read(nid):
    uid = int(get_jwt_identity())
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', (nid, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Marked as read"}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    uid = int(get_jwt_identity())
    conn = get_db_connection()
    count = conn.execute(
        'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0', (uid,)
    ).fetchone()['c']
    conn.close()
    return jsonify({"unread_count": count}), 200
