#!/bin/bash

# Docker Setup Script for Student Evaluation System
# This script helps set up the environment for Docker

set -e

echo "🐳 Setting up Docker environment for Student Evaluation System..."

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "📝 Creating .env file from env.example..."
    if [ -f "../env.example" ]; then
        cp ../env.example ../.env
        echo "✅ Created .env file. Please update it with your configuration."
    else
        echo "❌ env.example not found. Please create .env manually."
        exit 1
    fi
else
    echo "✅ .env file already exists."
fi

# Update .env with Docker-specific settings if needed
echo "🔧 Updating .env with Docker-specific settings..."

# Check if API_CORS_ORIGIN includes Docker network
if ! grep -q "http://web:3000" ../.env 2>/dev/null; then
    echo "⚠️  Note: Make sure API_CORS_ORIGIN in .env includes 'http://web:3000' for Docker networking"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the system, run:"
echo "  cd docker"
echo "  docker-compose up --build"
echo ""
echo "To start in background:"
echo "  docker-compose up -d --build"
echo ""

