@echo off
echo 🚀 DatRep Startup Script
echo ==================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the DatRep root directory.
    pause
    exit /b 1
)

echo ✅ Starting DatRep servers...
echo.

REM Start backend in a new window
echo 🐍 Starting backend server...
start "DatRep Backend" cmd /k "cd backend && python simple_server.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in a new window
echo ⚛️  Starting frontend server...
start "DatRep Frontend" cmd /k "npm run dev"

echo.
echo 🎉 DatRep servers are starting!
echo.
echo 📊 Backend: http://localhost:8000
echo 🌐 Frontend: http://localhost:3000 (or 3001)
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo 💡 Close the command windows to stop the servers
echo.
pause 