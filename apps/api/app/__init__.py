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
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS")}}, supports_credentials=True)

    # JWT configuration
    @jwt.user_identity_loader
    def user_identity_lookup(user_id):
        return user_id

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).one_or_none()

    # Simple health route
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.api import api_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(api_bp, url_prefix="/api")

    # Create tables
    with app.app_context():
        db.create_all()

    return app


