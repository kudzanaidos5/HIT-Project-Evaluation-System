#!/bin/bash
set -e

echo "🚀 Starting Student Evaluation System API..."

# Wait for any database initialization if needed
# For SQLite, no need to wait, but this is here for future PostgreSQL support

# Initialize database and run migrations if needed
echo "📦 Initializing database..."
python -c "
from app import create_app
from app.extensions import db
app = create_app()
with app.app_context():
    db.create_all()
    print('✅ Database tables created/verified')
"

# Seed database (idempotent - won't create duplicates)
echo "🌱 Seeding database with initial data..."
python seed.py || {
    echo "⚠️  Seeding failed or database already seeded"
}

# Start the Flask application
echo "🎯 Starting Flask application..."
exec python wsgi.py

