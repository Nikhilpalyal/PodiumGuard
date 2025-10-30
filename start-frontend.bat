@echo off
echo ====================================
echo   MEV Defense Frontend (React)
echo ====================================
echo.

REM Navigate to frontend directory
cd /d "D:\f1-main\f1-main"

REM Check if we're in the correct directory
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please ensure this script runs from the correct directory.
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/3] Installing additional dependencies for MEV Defense...
call npm install ethers socket.io-client axios
if errorlevel 1 (
    echo Warning: Failed to install some dependencies, but continuing...
)

echo.
echo [3/3] Starting React Development Server...
echo.
echo ====================================
echo    Frontend Server Starting...
echo ====================================
echo.
echo The MEV Defense Dashboard will open at:
echo   http://localhost:3000
echo.
echo Make sure the backend is running at:
echo   http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

npm start