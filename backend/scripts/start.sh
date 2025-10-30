#!/bin/bash

# PodiumGuard X Backend Startup Script

echo "🚀 Starting PodiumGuard X Backend System..."

# Check if required environment variables are set
if [ -z "$ETHEREUM_RPC_URL" ]; then
    echo "❌ Error: ETHEREUM_RPC_URL environment variable is not set"
    echo "Please copy .env.example to .env and configure your settings"
    exit 1
fi

if [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_URI environment variable is not set"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p backups

# Check if MongoDB is running (if using local MongoDB)
if [[ $MONGODB_URI == mongodb://localhost* ]]; then
    echo "🔍 Checking MongoDB connection..."
    if ! pgrep mongod > /dev/null; then
        echo "⚠️  Warning: MongoDB is not running locally"
        echo "Please start MongoDB or update MONGODB_URI in .env"
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Install Python dependencies for AI engine
if [ ! -d "ai-engine/venv" ]; then
    echo "🐍 Setting up Python virtual environment..."
    cd ai-engine
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Compile smart contracts if artifacts don't exist
if [ ! -d "artifacts" ]; then
    echo "🔨 Compiling smart contracts..."
    npx hardhat compile
fi

# Check if contract is deployed
NETWORK=${ETHEREUM_NETWORK:-sepolia}
if [ ! -f "deployments/$NETWORK.json" ]; then
    echo "⚠️  Warning: Smart contract not deployed to $NETWORK network"
    echo "Run: npm run deploy-contract to deploy the contract"
fi

# Start services based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Starting production services with PM2..."
    
    # Install PM2 if not available
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Start services
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    echo "✅ Production services started!"
    echo "📊 Monitor with: pm2 monit"
    echo "📋 View logs with: pm2 logs"
    
else
    echo "🛠️  Starting development services..."
    
    # Start AI engine in background
    echo "🤖 Starting AI detection engine..."
    cd ai-engine
    source venv/bin/activate
    python app.py &
    AI_PID=$!
    cd ..
    
    # Give AI engine time to start
    sleep 3
    
    # Start Node.js backend
    echo "🌐 Starting Node.js backend..."
    npm run dev &
    NODE_PID=$!
    
    # Function to cleanup on exit
    cleanup() {
        echo "🛑 Shutting down services..."
        kill $AI_PID $NODE_PID 2>/dev/null
        exit 0
    }
    
    # Set trap to cleanup on exit
    trap cleanup SIGINT SIGTERM
    
    echo "✅ Development services started!"
    echo "🌐 Backend: http://localhost:${PORT:-5000}"
    echo "🤖 AI Engine: http://localhost:5001"
    echo "📊 Health Check: http://localhost:${PORT:-5000}/health"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for processes
    wait $NODE_PID $AI_PID
fi