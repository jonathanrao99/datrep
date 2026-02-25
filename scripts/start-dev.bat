@echo off
if not exist "package.json" (echo Run from repo root & exit /b 1)
echo Starting backend...
start "DatRep Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak > nul
echo Starting frontend...
start "DatRep Frontend" cmd /k "npm run dev"
echo Backend: http://localhost:8000  Frontend: http://localhost:3000
