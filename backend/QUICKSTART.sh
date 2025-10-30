#!/bin/bash

# PodiumGuard X - Quick Setup Guide

echo "🛡️  PodiumGuard X - Real-Time MEV Defense Dashboard Backend"
echo "============================================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher"
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher"
    exit 1
fi

# Check MongoDB
if command_exists mongod; then
    echo "✅ MongoDB: Installed"
else
    echo "⚠️  MongoDB not found locally. You can use MongoDB Atlas instead."
fi

echo ""
echo "📋 Setup Instructions:"
echo ""
echo "1. 📁 Navigate to the backend directory:"
echo "   cd backend"
echo ""
echo "2. 📦 Install dependencies:"
echo "   npm install"
echo ""
echo "3. 🐍 Setup Python AI engine:"
echo "   cd ai-engine"
echo "   python3 -m venv venv"
echo "   source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "   pip install -r requirements.txt"
echo "   cd .."
echo ""
echo "4. ⚙️  Configure environment:"
echo "   cp .env.example .env"
echo "   # Edit .env with your configuration:"
echo "   # - ETHEREUM_RPC_URL (get from Infura/Alchemy)"
echo "   # - PRIVATE_KEY (for contract deployment)"
echo "   # - MONGODB_URI (local or MongoDB Atlas)"
echo ""
echo "5. 🔨 Compile smart contracts:"
echo "   npx hardhat compile"
echo ""
echo "6. 🚀 Deploy smart contract (testnet):"
echo "   npx hardhat run scripts/deploy.js --network sepolia"
echo ""
echo "7. 🏃‍♂️ Start the system:"
echo "   # Development mode:"
echo "   ./scripts/start.sh"
echo "   # Or manually:"
echo "   # Terminal 1: cd ai-engine && python app.py"
echo "   # Terminal 2: npm run dev"
echo ""
echo "📊 API Endpoints after startup:"
echo "   Backend:    http://localhost:5000"
echo "   AI Engine:  http://localhost:5001"
echo "   Health:     http://localhost:5000/health"
echo "   WebSocket:  ws://localhost:5000"
echo ""
echo "🧪 Test the system:"
echo "   # Simulate a frontrunning attack:"
echo "   curl -X POST http://localhost:5000/api/simulate \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"attackType\": \"frontrunning\", \"count\": 1}'"
echo ""
echo "📚 API Documentation:"
echo "   GET  /api/transactions    - Recent transactions"
echo "   GET  /api/detections      - AI detection results"
echo "   GET  /api/stats           - System statistics"
echo "   POST /api/simulate        - Attack simulations"
echo ""
echo "🐳 Docker deployment:"
echo "   docker-compose up -d"
echo ""
echo "🏭 Production deployment:"
echo "   NODE_ENV=production ./scripts/start.sh"
echo ""
echo "📖 For detailed documentation, see: README.md"
echo ""

# Check if we're in the right directory
if [ -f "package.json" ] && [ -f "src/server.js" ]; then
    echo "✅ You're in the correct directory!"
    echo ""
    echo "🚀 Ready to start? Run:"
    echo "   ./scripts/start.sh"
else
    echo "⚠️  Please navigate to the backend directory first:"
    echo "   cd backend"
fi

echo ""
echo "🆘 Need help? Check the documentation or create an issue!"
echo "============================================================="