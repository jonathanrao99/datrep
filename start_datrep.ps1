# DatRep Startup Script for Windows
# Runs both frontend and backend servers

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 DatRep Startup Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param($Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param($Url, $ServiceName, $MaxWait = 30)
    
    Write-Host "⏳ Waiting for $ServiceName to start..." -ForegroundColor Yellow
    for ($i = 1; $i -le $MaxWait; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $ServiceName is running on $Url" -ForegroundColor Green
                return $true
            }
        }
        catch {
            if ($i % 5 -eq 0) {
                Write-Host "   Still waiting... ($i/$MaxWait)" -ForegroundColor Yellow
            }
        }
        Start-Sleep 1
    }
    Write-Host "❌ $ServiceName failed to start within $MaxWait seconds" -ForegroundColor Red
    return $false
}

# Check if ports are already in use
if (Test-Port 8000) {
    Write-Host "⚠️  Port 8000 is already in use. Backend may already be running." -ForegroundColor Yellow
}

if (Test-Port 3000) {
    Write-Host "⚠️  Port 3000 is already in use. Frontend may already be running." -ForegroundColor Yellow
}

# Start Backend
Write-Host "🚀 Starting DatRep Backend..." -ForegroundColor Green

if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

try {
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD\backend
        python simple_server.py
    }
    
    # Wait for backend to start
    if (Wait-ForService -Url "http://localhost:8000/health" -ServiceName "Backend") {
        $backendRunning = $true
    } else {
        Write-Host "❌ Backend startup failed. Exiting." -ForegroundColor Red
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        exit 1
    }
}
catch {
    Write-Host "❌ Failed to start backend: $_" -ForegroundColor Red
    exit 1
}

# Start Frontend
Write-Host "🚀 Starting DatRep Frontend..." -ForegroundColor Green

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev
    }
    
    # Wait for frontend to start
    if (Wait-ForService -Url "http://localhost:3000" -ServiceName "Frontend") {
        $frontendRunning = $true
    } else {
        Write-Host "❌ Frontend startup failed. Exiting." -ForegroundColor Red
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        exit 1
    }
}
catch {
    Write-Host "❌ Failed to start frontend: $_" -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

# Success message
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🎉 DatRep is now running!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📊 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "🔧 Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "📖 API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# Keep script running and monitor jobs
try {
    while ($true) {
        $backendStatus = Get-Job $backendJob -ErrorAction SilentlyContinue
        $frontendStatus = Get-Job $frontendJob -ErrorAction SilentlyContinue
        
        if ($backendStatus.State -eq "Failed" -or $frontendStatus.State -eq "Failed") {
            Write-Host "⚠️  One or more services have failed" -ForegroundColor Red
            break
        }
        
        Start-Sleep 5
    }
}
catch {
    Write-Host "`n🛑 Shutting down DatRep..." -ForegroundColor Yellow
}
finally {
    # Cleanup
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    
    if ($backendJob) {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
    }
    
    if ($frontendJob) {
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
    }
    
    Write-Host "✅ DatRep shutdown complete" -ForegroundColor Green
} 