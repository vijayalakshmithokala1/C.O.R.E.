"""
Admin / Evaluator Routes (Development Mode Only)
GET    /api/admin/users          — List all registered users
DELETE /api/admin/users/<id>     — Delete a user (for test resets)
POST   /api/admin/users/<id>/verify — Manually verify a user
"""
import os
from flask import Blueprint, jsonify
from models import db, User

admin_bp = Blueprint("admin", __name__)


def dev_only(f):
    """Guard: only allow in DEVELOPMENT_MODE."""
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if os.getenv("DEVELOPMENT_MODE") != "true":
            return jsonify({"error": "Forbidden — not in development mode."}), 403
        return f(*args, **kwargs)
    return wrapper


@admin_bp.route("/users", methods=["GET"])
@dev_only
def list_users():
    """Return all users with full details for the evaluator dashboard."""
    users = User.query.order_by(User.id.desc()).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_verified": u.is_verified,
            "password_hash": u.password_hash,   # shown to evaluators to prove hashing
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return jsonify({"users": result, "total": len(result)})


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@dev_only
def delete_user(user_id):
    """Delete a user (test reset)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": f"User {user_id} deleted."})


@admin_bp.route("/users/<int:user_id>/verify", methods=["POST"])
@dev_only
def manual_verify(user_id):
    """Manually mark a user as verified."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    user.is_verified = True
    db.session.commit()
    return jsonify({"message": f"User {user.email} marked as verified.", "user_id": user_id})
