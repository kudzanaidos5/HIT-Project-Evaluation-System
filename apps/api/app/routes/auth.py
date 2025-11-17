from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.models import User, UserRole
from marshmallow import Schema, fields, ValidationError
from datetime import timedelta
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import uuid

auth_bp = Blueprint('auth', __name__)

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, min_length=6)

class RegisterSchema(Schema):
    name = fields.Str(required=True, min_length=2)
    email = fields.Email(required=True)
    password = fields.Str(required=True, min_length=6)
    role = fields.Str(required=True, validate=lambda x: x in ['ADMIN', 'STUDENT'])

login_schema = LoginSchema()
register_schema = RegisterSchema()

ALLOWED_EMAIL_DOMAIN = "@hit.ac.zw"

def is_allowed_domain(email: str) -> bool:
    try:
        return isinstance(email, str) and email.lower().endswith(ALLOWED_EMAIL_DOMAIN)
    except Exception:
        return False

def _create_tokens_for_user(user: User):
    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=1))
    refresh_token = create_refresh_token(identity=str(user.id), expires_delta=timedelta(days=30))
    return access_token, refresh_token


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = login_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": {"message": "Email and password are required", "code": "MISSING_CREDENTIALS"}}), 400
    
    # Enforce institutional email domain
    if not is_allowed_domain(data.get('email', '')):
        return jsonify({"error": {"message": f"Only {ALLOWED_EMAIL_DOMAIN} emails are allowed", "code": "INVALID_EMAIL_DOMAIN"}}), 400
    
    email = data['email'].lower()

    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": {"message": "Invalid email or password", "code": "UNAUTHORIZED"}}), 401
    
    if user.is_oauth_user:
        return jsonify({"error": {"message": "This account uses Google sign-in. Please sign in with Google.", "code": "OAUTH_ACCOUNT"}}), 403

    if not user.check_password(data['password']):
        return jsonify({"error": {"message": "Invalid email or password", "code": "UNAUTHORIZED"}}), 401
    
    try:
        access_token, refresh_token = _create_tokens_for_user(user)
        
        return jsonify({
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"error": {"message": "Authentication failed", "code": "AUTH_ERROR"}}), 500

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    # Only admins can register new users
    current_user_id = get_jwt_identity()
    
    try:
        current_user_id = int(current_user_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid token"}), 401
    
    current_user = User.query.get(current_user_id)
    if not current_user or current_user.role != UserRole.ADMIN:
        return jsonify({"error": "Only admins can register users"}), 403
    
    try:
        data = register_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    
    email = data['email'].lower()

    # Enforce institutional email domain
    if not is_allowed_domain(email):
        return jsonify({"error": {"message": f"Only {ALLOWED_EMAIL_DOMAIN} emails are allowed", "code": "INVALID_EMAIL_DOMAIN"}}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        message = "User with this email already exists"
        if existing_user.is_oauth_user:
            message = "User already registered via Google sign-in"
        return jsonify({"error": message}), 409
    
    # Create new user
    user = User(
        name=data['name'],
        email=email,
        role=UserRole(data['role'])
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({"message": "User created successfully", "user": user.to_dict()}), 201

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity, expires_delta=timedelta(hours=1))
    return jsonify({"accessToken": access_token}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = User.query.get(int(identity))
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # In a real app, you might want to blacklist the token
    return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        data = request.json
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        if not current_password or not new_password:
            return jsonify({"error": "Current password and new password are required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters long"}), 400
        
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.is_oauth_user:
            return jsonify({"error": "Google sign-in accounts cannot change passwords here"}), 400
        
        if not user.check_password(current_password):
            return jsonify({"error": "Current password is incorrect"}), 401
        
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to change password"}), 500

@auth_bp.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    # Only admins can reset passwords
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != UserRole.ADMIN:
        return jsonify({"error": "Admin access required"}), 403
    
    try:
        data = request.json
        user_id = data.get('userId')
        new_password = data.get('newPassword')
        
        if not user_id or not new_password:
            return jsonify({"error": "User ID and new password are required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.is_oauth_user:
            return jsonify({"error": "Cannot reset password for Google sign-in accounts"}), 400

        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to reset password"}), 500


@auth_bp.route('/google', methods=['POST'])
def google_login():
    data = request.get_json(silent=True) or {}
    credential = data.get("credential") or data.get("idToken")
    if not credential:
        return jsonify({"error": {"message": "Missing Google credential", "code": "MISSING_CREDENTIAL"}}), 400

    google_client_id = current_app.config.get("GOOGLE_OAUTH_CLIENT_ID")
    if not google_client_id:
        return jsonify({"error": {"message": "Google OAuth not configured", "code": "OAUTH_NOT_CONFIGURED"}}), 503

    try:
        id_info = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id
        )
    except ValueError:
        return jsonify({"error": {"message": "Invalid Google credential", "code": "INVALID_CREDENTIAL"}}), 401

    email = (id_info.get("email") or "").lower()
    if not email:
        return jsonify({"error": {"message": "Google account missing email", "code": "EMAIL_REQUIRED"}}), 400

    if not is_allowed_domain(email):
        return jsonify({"error": {"message": f"Only {ALLOWED_EMAIL_DOMAIN} emails are allowed", "code": "INVALID_EMAIL_DOMAIN"}}), 400

    sub = id_info.get("sub")
    if not sub:
        return jsonify({"error": {"message": "Google credential missing subject", "code": "INVALID_CREDENTIAL"}}), 400

    full_name = id_info.get("name") or email.split("@")[0]

    user = User.query.filter_by(email=email).first()

    if user:
        if not user.is_oauth_user:
            return jsonify({"error": {"message": "Account already exists with password login. Please sign in manually.", "code": "ACCOUNT_CONFLICT"}}), 409

        # Update stored Google info if necessary
        user.is_oauth_user = True
        user.oauth_provider = "google"
        user.oauth_subject = sub
        if not user.name and full_name:
            user.name = full_name
    else:
        user = User(
            name=full_name,
            email=email,
            role=UserRole.STUDENT,
            is_oauth_user=True,
            oauth_provider="google",
            oauth_subject=sub,
        )
        # Assign a random password hash to satisfy non-null constraint
        user.set_password(uuid.uuid4().hex)
        db.session.add(user)

    db.session.commit()

    try:
        access_token, refresh_token = _create_tokens_for_user(user)
    except Exception:
        return jsonify({"error": {"message": "Authentication failed", "code": "AUTH_ERROR"}}), 500

    return jsonify({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": user.to_dict()
    }), 200