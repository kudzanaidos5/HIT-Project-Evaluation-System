@echo off
echo ========================================
echo HIT Project Evaluation System Setup
echo ========================================
echo.

echo [1/4] Setting up frontend environment...
if not exist "apps\web\.env.local" (
    echo NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api > apps\web\.env.local
    echo Created .env.local
) else (
    echo .env.local already exists
)
echo.

echo [2/4] Installing backend dependencies...
cd apps\api
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    pip install -r requirements.txt >nul 2>&1
    echo Backend dependencies installed
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)
cd ..\..
echo.

echo [3/4] Seeding database...
cd apps\api
call venv\Scripts\activate.bat
python seed.py
cd ..\..
echo.

echo [4/4] Installing frontend dependencies...
cd apps\web
call npm install
cd ..\..
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the system:
echo.
echo Terminal 1 - Backend:
echo   cd apps\api
echo   venv\Scripts\activate
echo   python wsgi.py
echo.
echo Terminal 2 - Frontend:
echo   cd apps\web
echo   npm run dev
echo.
echo Default Admin Login:
echo   Email: admin@hit.ac.zw
echo   Password: Admin123!
echo.
pause

