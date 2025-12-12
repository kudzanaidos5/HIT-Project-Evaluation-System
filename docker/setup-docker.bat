@echo off
REM Docker Setup Script for Student Evaluation System (Windows)
REM This script helps set up the environment for Docker

echo 🐳 Setting up Docker environment for Student Evaluation System...

REM Check if .env exists
if not exist "..\.env" (
    echo 📝 Creating .env file from env.example...
    if exist "..\env.example" (
        copy ..\env.example ..\.env
        echo ✅ Created .env file. Please update it with your configuration.
    ) else (
        echo ❌ env.example not found. Please create .env manually.
        exit /b 1
    )
) else (
    echo ✅ .env file already exists.
)

echo.
echo ✅ Setup complete!
echo.
echo To start the system, run:
echo   cd docker
echo   docker-compose up --build
echo.
echo To start in background:
echo   docker-compose up -d --build
echo.

