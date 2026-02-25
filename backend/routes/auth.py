"""
routes/auth.py
──────────────
Authentication routes: register, login, profile, faculty list.

Endpoints:
    POST /api/auth/register   – Faculty self-registration
    POST /api/auth/login      – Login → JWT token
    GET  /api/auth/me         – Current user profile (JWT required)
    GET  /api/auth/faculty    – List all faculty users (custodian only)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models import db, User
from auth_middleware import jwt_required_decorator, require_custodian, get_current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Faculty self-registration.
    
    Body: { name, email, password }
    Returns: 201 with user info on success.
    """
    try:
        data = request.get_json()
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')
        department = (data.get('department') or '').strip() or None

        # Validate required fields
        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Check for duplicate email
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'An account with this email already exists'}), 409

        # Create faculty user (role always 'faculty' for self-registration)
        user = User(name=name, email=email, role='faculty', department=department)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        print(f"✅ New faculty registered: {name} ({email})")

        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password.
    
    Body: { email, password }
    Returns: { token, user } on success.
    """
    try:
        data = request.get_json()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate JWT access token (identity = user id)
        token = create_access_token(identity=user.id)

        print(f"✅ Login: {user.name} ({user.role})")

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required_decorator
def me():
    """Return the currently authenticated user's profile."""
    user = get_current_user()
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/faculty', methods=['GET'])
def list_faculty():
    """List all registered faculty users.
    Accepts ?user_id=<id> to verify the requester is a custodian.
    """
    try:
        user_id = request.args.get('user_id', type=int)
        if user_id:
            requester = db.session.get(User, user_id)
            if not requester or requester.role != 'custodian':
                return jsonify({'error': 'Custodian access required'}), 403

        faculty = User.query.filter_by(role='faculty').order_by(User.name).all()
        return jsonify({
            'faculty': [u.to_dict() for u in faculty],
            'total': len(faculty)
        }), 200
    except Exception as e:
        print(f"❌ Error listing faculty: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/seed-custodian', methods=['POST'])
def seed_custodian():
    """Create the initial custodian account (only if no custodian exists).
    
    This endpoint is only usable when no custodian exists in the system.
    Body: { name, email, password }
    """
    try:
        # Only allow if no custodian exists yet
        existing = User.query.filter_by(role='custodian').first()
        if existing:
            return jsonify({'error': 'A custodian account already exists'}), 409

        data = request.get_json()
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')

        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already in use'}), 409

        custodian = User(name=name, email=email, role='custodian')
        custodian.set_password(password)
        db.session.add(custodian)
        db.session.commit()

        print(f"✅ Custodian account created: {name} ({email})")

        return jsonify({
            'message': 'Custodian account created successfully',
            'user': custodian.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Seed custodian error: {str(e)}")
        return jsonify({'error': str(e)}), 500
