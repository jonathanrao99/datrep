@echo off
echo ==================================================
echo 🚀 DatRep Startup Script
echo ==================================================
echo.

echo Starting Backend...
start "DatRep Backend" cmd /k "cd backend && python simple_server.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend...
start "DatRep Frontend" cmd /k "npm run dev"

echo.
echo ==================================================
echo 🎉 DatRep is starting!
echo ==================================================
echo 📊 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:8000
echo 📖 API Docs: http://localhost:8000/docs
echo.
echo Close the command windows to stop the services
echo ==================================================

pause 