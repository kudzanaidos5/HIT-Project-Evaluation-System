import os
from flask import Flask, jsonify
from .config import get_config
from .extensions import db, migrate, jwt, cors, bcrypt
from .models.models import User


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config())

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    # Configure CORS to handle preflight requests properly
    cors_origins = app.config.get("CORS_ORIGINS", "http://localhost:3000")
    # Handle comma-separated origins
    if isinstance(cors_origins, str) and ',' in cors_origins:
        cors_origins = [origin.strip() for origin in cors_origins.split(',')]
    
    cors.init_app(
        app, 
        resources={r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
        }}, 
        supports_credentials=True,
        automatic_options=True
    )

    # JWT configuration
    @jwt.user_identity_loader
    def user_identity_lookup(user_id):
        return user_id

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).one_or_none()
    
    # JWT error handlers - return 401 instead of 422 for missing/invalid tokens
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({"error": {"message": "Token has expired", "code": "TOKEN_EXPIRED"}}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": {"message": "Invalid token", "code": "INVALID_TOKEN"}}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": {"message": "Authorization token is missing", "code": "MISSING_TOKEN"}}), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_data):
        return jsonify({"error": {"message": "Fresh token required", "code": "TOKEN_NOT_FRESH"}}), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_data):
        return jsonify({"error": {"message": "Token has been revoked", "code": "TOKEN_REVOKED"}}), 401

    # Simple health route
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.api import api_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(api_bp, url_prefix="/api")

    # Create tables only if not using migrations (for backward compatibility)
    # When using Flask-Migrate, tables should be created via migrations
    skip_table_creation = os.getenv("SKIP_TABLE_CREATION", "False").lower() == "true"
    if not skip_table_creation:
        with app.app_context():
            # Only create if tables don't exist (migration-friendly)
            try:
                db.create_all()
            except Exception as e:
                # If database doesn't exist yet, that's okay - migrations will handle it
                import logging
                logging.warning(f"Could not create tables on startup: {e}")

    return app


