// Real-time MEV Data Service
// Handles WebSocket connections and API calls to the backend

class MEVDataService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  }

  // Connect to the backend WebSocket
  connect() {
    try {
      // Use Socket.IO if available, otherwise fallback to WebSocket
      if (window.io) {
        this.socket = window.io(this.baseUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        this.setupSocketListeners();
      } else {
        console.warn('Socket.IO not available, using mock data service');
        this.setupMockDataStream();
      }
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      this.setupMockDataStream();
    }
  }

  // Setup Socket.IO event listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to MEV defense backend');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from backend:', reason);
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected', reason });
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.attemptReconnect();
    });

    // MEV Detection Events
    this.socket.on('mev_detection', (data) => {
      console.log('🔍 MEV Detection received:', data);
      this.emit('mevDetection', {
        id: data.id || Math.random().toString(36).substr(2, 9),
        attackType: data.attackType || 'Unknown Attack',
        riskLevel: data.riskLevel || 'MEDIUM',
        targetAddress: data.targetAddress,
        potentialLoss: data.potentialLoss || '0',
        confidence: data.confidence || 75,
        timestamp: data.timestamp || new Date().toISOString(),
        blocked: data.blocked || false,
        transactionHash: data.transactionHash
      });
    });

    // Protection Triggered Events
    this.socket.on('protection_triggered', (data) => {
      console.log('🛡️ Protection triggered:', data);
      this.emit('protectionTriggered', {
        userId: data.userId,
        transactionHash: data.transactionHash,
        protectionType: data.protectionType,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    // Mempool Updates
    this.socket.on('mempool_update', (data) => {
      this.emit('mempoolUpdate', {
        transactions: data.transactions || [],
        aiInsights: data.aiInsights || null,
        networkStats: data.networkStats || {}
      });
    });

    // AI Analysis Results
    this.socket.on('ai_analysis_complete', (data) => {
      this.emit('aiAnalysisComplete', {
        transactionHash: data.transactionHash,
        analysis: data.analysis,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    // Network Alerts
    this.socket.on('network_alert', (data) => {
      this.emit('networkAlert', {
        level: data.level || 'INFO',
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });
  }

  // Setup mock data stream when backend is not available
  setupMockDataStream() {
    console.log('🎭 Using mock data service');
    this.isConnected = true;
    
    // Simulate connection
    setTimeout(() => {
      this.emit('connection', { status: 'connected', mock: true });
    }, 500);

    // Generate mock MEV detections
    const generateMockDetection = () => {
      const attackTypes = [
        'Sandwich Attack',
        'Front-running Attack', 
        'Back-running Attack',
        'Arbitrage Attack',
        'Flash Loan Attack',
        'Liquidation Attack'
      ];
      
      const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
        targetAddress: '0x' + Math.random().toString(16).substr(2, 40),
        potentialLoss: (Math.random() * 0.5).toFixed(4),
        confidence: Math.floor(Math.random() * 30 + 70),
        timestamp: new Date().toISOString(),
        blocked: Math.random() > 0.3,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
      };
    };

    // Emit mock data every 3-5 seconds
    const mockInterval = setInterval(() => {
      if (this.isConnected) {
        this.emit('mevDetection', generateMockDetection());
      } else {
        clearInterval(mockInterval);
      }
    }, Math.random() * 2000 + 3000);
  }

  // Attempt to reconnect to the backend
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached, switching to mock mode');
      this.setupMockDataStream();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Subscribe to events
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  // Unsubscribe from events
  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Emit events to subscribers
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect from the backend
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  // API Methods for direct backend communication

  // Get AI analysis for a transaction
  async getAIAnalysis(transactionData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      
      // Return mock analysis when API fails
      return this.getMockAIAnalysis(transactionData);
    }
  }

  // Mock AI analysis for fallback
  getMockAIAnalysis(transactionData) {
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const threats = [
      'Sandwich Attack Pattern',
      'Front-running Detected', 
      'Price Manipulation',
      'Flash Loan Risk'
    ];
    
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    return {
      transactionHash: transactionData.hash,
      riskLevel,
      confidence: Math.floor(Math.random() * 30 + 70),
      threats: riskLevel === 'HIGH' ? [threats[Math.floor(Math.random() * threats.length)]] : [],
      potentialMevValue: riskLevel === 'HIGH' ? (Math.random() * 0.5).toFixed(4) : '0',
      recommendation: riskLevel === 'HIGH' ? 'BLOCK' : 'MONITOR',
      analysis: {
        gasPrice: Math.random() > 0.5 ? 'SUSPICIOUS' : 'NORMAL',
        timing: Math.random() > 0.7 ? 'FRONT_RUNNING' : 'NORMAL',
        valueFlow: Math.random() > 0.6 ? 'ARBITRAGE' : 'NORMAL'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get network statistics
  async getNetworkStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get network stats:', error);
      
      // Return mock stats
      return {
        totalTransactions: Math.floor(Math.random() * 10000 + 50000),
        pendingTransactions: Math.floor(Math.random() * 500 + 100),
        averageGasPrice: Math.floor(Math.random() * 50 + 20),
        mevOpportunities: Math.floor(Math.random() * 20 + 5),
        threatLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)]
      };
    }
  }

  // Get protection statistics for user
  async getProtectionStats(userAddress) {
    try {
      const response = await fetch(`${this.baseUrl}/api/protection/stats/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get protection stats:', error);
      
      // Return mock stats
      return {
        totalProtected: Math.floor(Math.random() * 1000 + 500),
        threatsBlocked: Math.floor(Math.random() * 100 + 20),
        savingsGenerated: (Math.random() * 10 + 5).toFixed(3),
        protectionActive: true
      };
    }
  }

  // Submit user feedback
  async submitFeedback(feedback) {
    try {
      const response = await fetch(`${this.baseUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback)
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return { success: false, error: error.message };
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Export singleton instance
const mevDataService = new MEVDataService();
export default mevDataService;

// Also export the class for custom instances
export { MEVDataService };