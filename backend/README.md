# PodiumGuard X - Real-Time MEV Defense Dashboard Backend

A comprehensive Node.js + Flask backend system for detecting and mitigating MEV (Maximal Extractable Value) attacks on Ethereum in real-time.

## 🚀 Features

- **Real-time Mempool Monitoring**: WebSocket connection to Ethereum network
- **AI-Powered Risk Detection**: Flask-based ML engine for MEV pattern recognition
- **Smart Contract Integration**: On-chain logging and system mode management
- **Safe Mode System**: Automatic threat response with configurable thresholds
- **RESTful API**: Complete API for frontend dashboard integration
- **WebSocket Broadcasting**: Real-time alerts and updates
- **MongoDB Storage**: Persistent detection and analytics data
- **Comprehensive Analytics**: Statistical analysis and reporting

## 📋 Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Smart Contract](#smart-contract)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Ethereum      │───▶│  Mempool     │───▶│  AI Detection   │
│   Network       │    │  Listener    │    │  Engine (Flask) │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │◀───│  WebSocket   │◀───│  Node.js API    │
│   Dashboard     │    │  Server      │    │  Server         │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Smart         │◀───│  Safe Mode   │───▶│  MongoDB        │
│   Contract      │    │  Service     │    │  Database       │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 🛠️ Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Python 3.8 or higher
- MongoDB 5.0 or higher
- Ethereum RPC access (Infura, Alchemy, or local node)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/podiumguard-x.git
   cd podiumguard-x/backend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies for AI engine**
   ```bash
   cd ai-engine
   pip install -r requirements.txt
   cd ..
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Compile and deploy smart contract**
   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network sepolia
   ```

6. **Start the services**
   ```bash
   # Terminal 1: Start AI engine
   cd ai-engine && python app.py

   # Terminal 2: Start Node.js backend
   npm run dev
   ```

## ⚙️ Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Network Configuration
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=wss://sepolia.infura.io/ws/v3/YOUR_KEY
PRIVATE_KEY=0x...

# Database
MONGODB_URI=mongodb://localhost:27017/podiumguard

# AI Engine
AI_ENGINE_URL=http://localhost:5001

# Detection Thresholds
HIGH_RISK_THRESHOLD=75
SAFE_MODE_THRESHOLD=5
EMERGENCY_THRESHOLD=10
```

### Smart Contract Deployment

1. **Configure network in hardhat.config.js**
2. **Deploy to testnet**:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3. **Verify contract** (optional):
   ```bash
   npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
   ```

## 🚦 Usage

### Starting the System

1. **Start MongoDB** (if running locally)
2. **Start AI Engine**:
   ```bash
   cd ai-engine
   python app.py
   ```
3. **Start Backend**:
   ```bash
   npm start
   ```

### Health Checks

- Backend: `GET http://localhost:5000/health`
- AI Engine: `GET http://localhost:5001/health`

### Testing with Simulations

```bash
# Simulate a frontrunning attack
curl -X POST http://localhost:5000/api/simulate \\
  -H "Content-Type: application/json" \\
  -d '{"attackType": "frontrunning", "count": 1}'

# Run stress test
curl -X POST http://localhost:5000/api/simulate/stress-test \\
  -H "Content-Type: application/json" \\
  -d '{"duration": 60, "attacksPerMinute": 10}'
```

## 📚 API Documentation

### Core Endpoints

#### Transactions
- `GET /api/transactions` - Get recent transactions
- `GET /api/transactions/:hash` - Get specific transaction
- `POST /api/transactions/search` - Advanced search

#### Detections
- `GET /api/detections` - Get detection results
- `GET /api/detections/:id` - Get specific detection
- `PUT /api/detections/:id/mitigate` - Mark as mitigated
- `GET /api/detections/stats/summary` - Detection statistics

#### Statistics
- `GET /api/stats` - System overview
- `GET /api/stats/performance` - Performance metrics
- `GET /api/stats/risk-distribution` - Risk analysis
- `GET /api/stats/realtime` - Live system status

#### Simulation
- `POST /api/simulate` - Simulate attacks
- `POST /api/simulate/custom` - Custom transaction simulation
- `GET /api/simulate/presets` - Available attack presets
- `POST /api/simulate/stress-test` - System stress testing

### WebSocket Events

#### Client → Server
```javascript
// Subscribe to detection alerts
socket.emit('subscribe', { channel: 'detections' });
```

#### Server → Client
```javascript
// New detection alert
socket.on('new_detection', (data) => {
  console.log('New detection:', data);
});

// High-risk alert
socket.on('high_risk_alert', (data) => {
  console.log('High-risk transaction detected:', data);
});

// System mode change
socket.on('system_mode_changed', (data) => {
  console.log('System mode changed:', data);
});

// Emergency alert
socket.on('emergency_triggered', (data) => {
  console.log('Emergency mode activated:', data);
});
```

## 📜 Smart Contract

### Contract Functions

```solidity
// Log a new detection
function logDetection(
    string memory _txHash,
    address _from,
    address _to,
    uint256 _value,
    uint256 _riskScore,
    DetectionCategory _category,
    string[] memory _riskFactors
) external;

// Change system mode
function setSystemMode(SystemMode _mode, string memory _reason) external;

// Get detection details
function getDetection(uint256 _detectionId) external view returns (...);

// Get system statistics
function getSystemStats() external view returns (...);
```

### Events

```solidity
event DetectionLogged(uint256 indexed detectionId, string indexed txHash, ...);
event SystemModeChanged(SystemMode previousMode, SystemMode newMode, ...);
event HighRiskAlert(uint256 indexed detectionId, string indexed txHash, ...);
event EmergencyTriggered(uint256 detectionCount, uint256 timeWindow, ...);
```

## 🔧 Development

### Project Structure

```
backend/
├── src/
│   ├── server.js           # Main application entry
│   ├── services/           # Core business logic
│   │   ├── mempoolListener.js
│   │   ├── aiService.js
│   │   ├── contractService.js
│   │   └── safeModeService.js
│   ├── routes/             # API route handlers
│   ├── models/             # Database schemas
│   └── utils/              # Helper functions
├── ai-engine/              # Flask AI detection engine
├── contracts/              # Solidity smart contracts
├── scripts/                # Deployment and utility scripts
└── deployments/           # Contract deployment info
```

### Running Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check types
npm run type-check
```

### Adding New Detection Algorithms

1. **Update AI engine** (`ai-engine/app.py`):
   ```python
   def _analyze_new_pattern(self, tx_data):
       risk_score = 0
       factors = []
       # Your detection logic here
       return {'score': risk_score, 'factors': factors}
   ```

2. **Add to main analysis**:
   ```python
   def analyze_transaction(self, tx_data):
       # ... existing code ...
       new_pattern_risk = self._analyze_new_pattern(tx_data)
       risk_score += new_pattern_risk['score']
       risk_factors.extend(new_pattern_risk['factors'])
   ```

## 🚀 Deployment

### Production Environment

1. **Environment setup**:
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/podiumguard
   ETHEREUM_RPC_URL=wss://mainnet.infura.io/ws/v3/YOUR_KEY
   ```

2. **Process management** (PM2):
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

3. **Reverse proxy** (Nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Monitoring

- **Logs**: Winston logging with file rotation
- **Metrics**: Prometheus metrics endpoint
- **Health**: Built-in health check endpoints
- **Alerts**: Email/Slack notifications for critical events

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow ESLint configuration
- Write unit tests for new features
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/yourusername/podiumguard-x/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/podiumguard-x/issues)
- **Discord**: [Community Server](https://discord.gg/podiumguard)

## 🙏 Acknowledgments

- [Ethers.js](https://docs.ethers.io/) for Ethereum interaction
- [Flask](https://flask.palletsprojects.com/) for AI detection engine
- [Socket.IO](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for data persistence

---

**⚠️ Security Notice**: This is experimental software for educational and research purposes. Use at your own risk in production environments.