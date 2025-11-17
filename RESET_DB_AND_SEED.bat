@echo off
setlocal enableextensions
cd /d "%~dp0"

echo [RESET] Stopping any running backend is recommended before proceeding.

REM Navigate to API app
cd apps\api

REM Ensure instance directory exists
if not exist instance (
  mkdir instance
)

REM Delete dev.db if it exists
if exist instance\dev.db (
  echo [RESET] Deleting instance\dev.db
  del /f /q instance\dev.db
) else (
  echo [RESET] No existing dev.db found (nothing to delete)
)

REM Seed database
if exist venv\Scripts\python.exe (
  echo [RESET] Seeding database...
  venv\Scripts\python.exe seed.py || goto :error
) else (
  echo [ERROR] Python venv not found at apps\api\venv. Activate or run setup first.
  goto :eof
)

echo [RESET] Done. You can now start the backend and reload the app.
goto :eof

:error
echo [ERROR] Seeding failed. Check the console output above.
exit /b 1


