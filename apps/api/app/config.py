import os
from pathlib import Path

# Get the base directory (apps/api)
BASE_DIR = Path(__file__).resolve().parent.parent
# Default to instance/dev.db relative to the api directory
DEFAULT_DB_PATH = BASE_DIR / "instance" / "dev.db"

class Config:
    # Use absolute path for SQLite to avoid path resolution issues
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("sqlite:///"):
        # If it's a relative path, convert to absolute
        if not db_url.startswith("sqlite:///C:") and not db_url.startswith("sqlite:////"):
            # Extract the path part
            db_path = db_url.replace("sqlite:///", "")
            if not os.path.isabs(db_path):
                # Make it absolute relative to BASE_DIR
                db_path = str(BASE_DIR / db_path)
            # URL encode spaces and special characters for SQLite
            db_path = db_path.replace("\\", "/")
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        else:
            SQLALCHEMY_DATABASE_URI = db_url
    elif db_url:
        SQLALCHEMY_DATABASE_URI = db_url
    else:
        # Default: use absolute path
        db_path = str(DEFAULT_DB_PATH).replace("\\", "/")
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "dev-jwt-secret")
    CORS_ORIGINS = os.getenv("API_CORS_ORIGIN", "http://localhost:3000")
    GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")


def get_config() -> type[Config]:
    return Config


