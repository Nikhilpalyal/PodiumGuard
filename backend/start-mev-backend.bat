@echo off
echo ====================================
echo    MEV Defense System Backend
echo ====================================
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please run this script from the backend directory.
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/4] Checking environment configuration...
if not exist ".env" (
    echo Creating .env file from example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your configuration!
    echo Opening .env file...
    start notepad .env
    echo.
    echo Press any key when you've finished editing .env...
    pause >nul
)

echo.
echo [3/4] Starting AI Engine (if available)...
REM Try to start AI engine in background
cd ai-engine 2>nul
if exist "app.py" (
    echo Found AI engine, attempting to start...
    if exist "venv\Scripts\python.exe" (
        start "AI Engine" cmd /c "venv\Scripts\python.exe app.py"
        echo AI Engine started in background window
    ) else (
        echo Virtual environment not found for AI engine
        echo AI engine will run in demo mode
    )
) else (
    echo AI engine not found, will run in demo mode
)
cd ..

echo.
echo [4/4] Starting MEV Defense Backend...
echo.
echo ====================================
echo    Backend Server Starting...
echo ====================================
echo.
echo Available endpoints:
echo   - Main API: http://localhost:3001
echo   - Health: http://localhost:3001/health
echo   - MEV API: http://localhost:3001/api/mev/*
echo   - WebSocket: ws://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

node src/server.js