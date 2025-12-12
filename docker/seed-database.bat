@echo off
REM Script to seed the database in the running Docker container

echo 🌱 Seeding database in Docker container...

REM Check if container is running
docker exec student-eval-api python -c "from app import create_app; from app.extensions import db; app = create_app(); app.app_context().push(); db.create_all(); print('✅ Database tables created/verified')" 2>nul
if errorlevel 1 (
    echo ❌ Container 'student-eval-api' is not running!
    echo Please start the containers first: docker-compose up -d
    exit /b 1
)

REM Seed the database
docker exec student-eval-api python seed.py

if errorlevel 1 (
    echo ❌ Seeding failed!
    exit /b 1
)

echo ✅ Database seeded successfully!
echo.
echo Default credentials:
echo   Admin: admin@hit.ac.zw / Admin123!
echo   Students: [email]@hit.ac.zw / Student123!

