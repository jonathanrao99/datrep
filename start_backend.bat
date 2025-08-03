@echo off
echo Starting DatRep Backend with uvicorn...
cd backend
uvicorn simple_server:app --host 0.0.0.0 --port 8000 --reload --log-level info
pause 