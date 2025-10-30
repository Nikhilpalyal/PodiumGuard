@echo off
echo 🛡️  PodiumGuard X - Starting Backend Services
echo =============================================

REM Create directories
if not exist "logs" mkdir logs
if not exist "deployments" mkdir deployments

echo 📁 Created necessary directories

REM Set development environment variables
set NODE_ENV=development
set PORT=5000
set AI_ENGINE_URL=http://localhost:5001
set MONGODB_URI=mongodb://localhost:27017/podiumguard

echo ⚙️  Environment configured

REM Display startup information
echo.
echo 🚀 Starting PodiumGuard X Services:
echo    Backend API:    http://localhost:5000
echo    AI Engine:      http://localhost:5001
echo    Health Check:   http://localhost:5000/health
echo.
echo 📋 Useful endpoints:
echo    GET  /api/stats           - System statistics
echo    GET  /api/detections      - Detection results
echo    POST /api/simulate        - Simulate attacks
echo.
echo 🛑 Press Ctrl+C to stop all services
echo.

REM Start AI engine in background
echo 🤖 Starting AI Detection Engine...
cd ai-engine
start /B "AI Engine" cmd /c "venv\Scripts\activate && python app.py"
cd ..

REM Wait a moment for AI engine to start
timeout /t 3 /nobreak >nul

REM Start Node.js backend
echo 🌐 Starting Node.js Backend...
npm run dev