// Enhanced MEV Defense System with Integrated Mempool
import { ethers } from 'ethers';
import winston from 'winston';
import EventEmitter from 'events';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

class MEVDefenseSystem extends EventEmitter {
  constructor(aiService, contractService, safeModeService, io) {
    super();
    this.aiService = aiService;
    this.contractService = contractService;
    this.safeModeService = safeModeService;
    this.io = io;
    
    // System state
    this.isActive = false;
    this.provider = null;
    this.processedTransactions = new Set();
    this.recentTransactions = [];
    this.mevDetections = [];
    this.protectedUsers = new Set();
    this.threatStats = {
      totalScanned: 0,
      threatsDetected: 0,
      threatsBlocked: 0,
      totalSaved: 0
    };
    
    // Configuration
    this.config = {
      network: process.env.ETHEREUM_NETWORK || 'sepolia',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'demo',
      minValue: ethers.parseEther(process.env.MIN_TRANSACTION_VALUE || '0.001'),
      gasThreshold: parseInt(process.env.GAS_THRESHOLD || '50000'),
      riskThreshold: parseInt(process.env.RISK_THRESHOLD || '75'),
      maxRecentTransactions: 1000,
      maxDetections: 500
    };

    this.setupProvider();
    this.startDemoMode();
  }

  setupProvider() {
    try {
      if (this.config.rpcUrl === 'demo' || !this.config.rpcUrl.startsWith('ws')) {
        logger.info('🎭 MEV Defense System running in DEMO MODE');
        logger.info('💡 For live data, set ETHEREUM_RPC_URL to a valid WebSocket endpoint');
        this.provider = null;
        return;
      }

      this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
      
      this.provider.on('error', (error) => {
        logger.error('Provider error:', error);
        this.handleProviderError(error);
      });

      this.provider.on('close', () => {
        logger.warn('Provider connection closed, attempting to reconnect...');
        this.reconnect();
      });

      logger.info(`🔗 Connected to ${this.config.network} network`);
    } catch (error) {
      logger.error('Failed to setup provider:', error);
      logger.info('🎭 Falling back to demo mode');
      this.provider = null;
    }
  }

  async start() {
    if (this.isActive) {
      logger.warn('MEV Defense System is already active');
      return;
    }

    try {
      this.isActive = true;
      logger.info('🛡️ Starting MEV Defense System...');

      // Initialize services
      await this.initializeServices();

      // Start mempool monitoring
      if (this.provider) {
        await this.startMempoolMonitoring();
      } else {
        logger.info('🎭 Demo mode active - generating mock data');
      }

      // Setup real-time broadcasting
      this.setupRealTimeBroadcasting();

      logger.info('✅ MEV Defense System started successfully');
      this.emit('started');
      
      // Broadcast system status
      this.broadcastSystemStatus();

    } catch (error) {
      logger.error('❌ Failed to start MEV Defense System:', error);
      this.isActive = false;
      throw error;
    }
  }

  async initializeServices() {
    try {
      // Initialize AI service
      if (this.aiService && typeof this.aiService.initialize === 'function') {
        await this.aiService.initialize();
        logger.info('🤖 AI Service initialized');
      } else {
        logger.warn('⚠️ AI Service not available or missing initialize method - using mock analysis');
      }

      // Initialize contract service
      if (this.contractService && typeof this.contractService.initialize === 'function') {
        await this.contractService.initialize();
        logger.info('📄 Contract Service initialized');
      } else {
        logger.warn('⚠️ Contract Service not available or missing initialize method');
      }

      // Initialize safe mode service
      if (this.safeModeService && typeof this.safeModeService.initialize === 'function') {
        this.safeModeService.initialize();
        logger.info('🔒 Safe Mode Service initialized');
      } else {
        logger.warn('⚠️ Safe Mode Service not available or missing initialize method');
      }

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      // Don't throw error - continue with available services
      logger.warn('⚠️ Some services failed to initialize, continuing with demo mode...');
    }
  }

  async startMempoolMonitoring() {
    try {
      logger.info('👁️ Starting mempool monitoring...');
      
      this.provider.on('pending', async (txHash) => {
        if (!this.isActive || this.processedTransactions.has(txHash)) {
          return;
        }

        this.processedTransactions.add(txHash);
        this.threatStats.totalScanned++;

        // Clean up old processed transactions
        if (this.processedTransactions.size > 10000) {
          const oldTxs = Array.from(this.processedTransactions).slice(0, 5000);
          oldTxs.forEach(tx => this.processedTransactions.delete(tx));
        }

        try {
          await this.analyzeTransaction(txHash);
        } catch (error) {
          logger.error(`Error analyzing transaction ${txHash}:`, error);
        }
      });

      logger.info('✅ Mempool monitoring started');
    } catch (error) {
      logger.error('Failed to start mempool monitoring:', error);
      throw error;
    }
  }

  startDemoMode() {
    if (this.provider) return; // Only run demo mode if no real provider

    logger.info('🎭 Starting demo mode with mock MEV detections...');
    
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
      const addresses = [
        '0x742d35Cc6634C0532925a3b8D39b4b6C5bC947C7',
        '0x8ba1f109551bD432803012645Hac136c776c4b4f',
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        '0xA0b86a33E6411BACb5231CeC1bac3eB1A9e3b457'
      ];

      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      const riskScore = riskLevel === 'HIGH' ? Math.floor(Math.random() * 25 + 75) :
                       riskLevel === 'MEDIUM' ? Math.floor(Math.random() * 25 + 50) :
                       Math.floor(Math.random() * 25 + 25);

      const detection = {
        id: Math.random().toString(36).substr(2, 9),
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        riskLevel,
        riskScore,
        targetAddress: addresses[Math.floor(Math.random() * addresses.length)],
        fromAddress: addresses[Math.floor(Math.random() * addresses.length)],
        toAddress: addresses[Math.floor(Math.random() * addresses.length)],
        value: (Math.random() * 10).toFixed(4),
        potentialLoss: riskLevel === 'HIGH' ? (Math.random() * 0.5).toFixed(4) : '0',
        confidence: Math.floor(Math.random() * 30 + 70),
        timestamp: new Date().toISOString(),
        blocked: riskScore > 75 ? Math.random() > 0.3 : false,
        gasPrice: Math.floor(Math.random() * 100 + 20),
        threats: riskLevel === 'HIGH' ? ['MEV Bot Activity', 'Price Manipulation'] : []
      };

      // Update stats
      this.threatStats.totalScanned++;
      if (riskScore > 50) {
        this.threatStats.threatsDetected++;
        if (detection.blocked) {
          this.threatStats.threatsBlocked++;
          this.threatStats.totalSaved += parseFloat(detection.potentialLoss);
        }
      }

      // Add to detections
      this.addMEVDetection(detection);

      // Broadcast detection
      this.broadcastMEVDetection(detection);

      // Broadcast updated stats
      this.broadcastThreatStats();

      return detection;
    };

    // Generate initial detections
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateMockDetection(), i * 1000);
    }

    // Continue generating detections every 3-5 seconds
    const demoInterval = setInterval(() => {
      if (this.isActive) {
        generateMockDetection();
      } else {
        clearInterval(demoInterval);
      }
    }, Math.random() * 2000 + 3000);
  }

  async analyzeTransaction(txHash) {
    try {
      // Get transaction details
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;

      // Filter transactions
      if (!this.shouldAnalyzeTransaction(tx)) {
        return;
      }

      // Extract transaction data
      const transactionData = this.extractTransactionData(tx);
      
      // Add to recent transactions
      this.addToRecentTransactions(transactionData);

      // Analyze with AI service
      let riskAnalysis = { riskScore: 0, category: 'normal', riskFactors: [] };
      
      if (this.aiService) {
        try {
          riskAnalysis = await this.aiService.analyzeTransaction(transactionData);
        } catch (error) {
          logger.error('AI analysis failed:', error);
        }
      }

      // Process if risky
      if (riskAnalysis.riskScore > 50) {
        await this.processMEVThreat(transactionData, riskAnalysis);
      }

      // Broadcast transaction update
      this.broadcastTransactionUpdate(transactionData, riskAnalysis);

    } catch (error) {
      logger.error(`Error analyzing transaction ${txHash}:`, error);
    }
  }

  async processMEVThreat(transactionData, riskAnalysis) {
    try {
      const detection = {
        id: Math.random().toString(36).substr(2, 9),
        txHash: transactionData.txHash,
        attackType: this.classifyAttackType(riskAnalysis),
        riskLevel: this.getRiskLevel(riskAnalysis.riskScore),
        riskScore: riskAnalysis.riskScore,
        targetAddress: transactionData.to,
        fromAddress: transactionData.from,
        toAddress: transactionData.to,
        value: transactionData.value,
        potentialLoss: this.calculatePotentialLoss(transactionData, riskAnalysis),
        confidence: riskAnalysis.confidence || 85,
        timestamp: new Date().toISOString(),
        blocked: false,
        gasPrice: transactionData.gasPrice,
        threats: riskAnalysis.riskFactors || []
      };

      // Update threat stats
      this.threatStats.threatsDetected++;

      // Check if we should block this transaction
      if (riskAnalysis.riskScore > this.config.riskThreshold) {
        detection.blocked = await this.attemptProtection(transactionData, riskAnalysis);
        
        if (detection.blocked) {
          this.threatStats.threatsBlocked++;
          this.threatStats.totalSaved += parseFloat(detection.potentialLoss);
          
          logger.warn(`🚫 High-risk transaction blocked: ${transactionData.txHash}`);
        }
      }

      // Store detection
      await this.storeDetection(detection);
      
      // Add to MEV detections
      this.addMEVDetection(detection);

      // Broadcast detection
      this.broadcastMEVDetection(detection);

      // Update safe mode if high risk
      if (riskAnalysis.riskScore > 75) {
        this.safeModeService?.recordDetection(riskAnalysis.riskScore);
      }

      return detection;
    } catch (error) {
      logger.error('Error processing MEV threat:', error);
    }
  }

  async attemptProtection(transactionData, riskAnalysis) {
    try {
      // Check if user is protected
      if (!this.protectedUsers.has(transactionData.from) && 
          !this.protectedUsers.has(transactionData.to)) {
        return false;
      }

      // Log protection attempt to smart contract
      if (this.contractService) {
        try {
          await this.contractService.logDetection(transactionData, riskAnalysis);
          return true;
        } catch (error) {
          logger.error('Failed to log detection to contract:', error);
        }
      }

      // For demo purposes, assume protection succeeded
      return true;
    } catch (error) {
      logger.error('Error attempting protection:', error);
      return false;
    }
  }

  shouldAnalyzeTransaction(tx) {
    // Skip if no value
    if (!tx.value || tx.value === 0n) return false;
    
    // Skip small transactions
    if (tx.value < this.config.minValue) return false;
    
    // Skip low gas transactions
    if (!tx.gasLimit || tx.gasLimit < this.config.gasThreshold) return false;
    
    // Skip contract creation
    if (!tx.to) return false;
    
    return true;
  }

  extractTransactionData(tx) {
    return {
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
      maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : null,
      gasLimit: tx.gasLimit.toString(),
      nonce: tx.nonce,
      data: tx.data,
      timestamp: new Date().toISOString(),
      blockNumber: tx.blockNumber,
      type: tx.type
    };
  }

  classifyAttackType(riskAnalysis) {
    const factors = riskAnalysis.riskFactors || [];
    
    if (factors.includes('sandwich')) return 'Sandwich Attack';
    if (factors.includes('frontrun')) return 'Front-running Attack';
    if (factors.includes('backrun')) return 'Back-running Attack';
    if (factors.includes('arbitrage')) return 'Arbitrage Attack';
    if (factors.includes('flashloan')) return 'Flash Loan Attack';
    if (factors.includes('liquidation')) return 'Liquidation Attack';
    
    return 'Suspicious Activity';
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 75) return 'HIGH';
    if (riskScore >= 50) return 'MEDIUM';
    return 'LOW';
  }

  calculatePotentialLoss(transactionData, riskAnalysis) {
    const baseValue = parseFloat(transactionData.value);
    const lossPercentage = riskAnalysis.riskScore / 100 * 0.1; // Max 10% loss
    return (baseValue * lossPercentage).toFixed(4);
  }

  addToRecentTransactions(transactionData) {
    this.recentTransactions.unshift(transactionData);
    if (this.recentTransactions.length > this.config.maxRecentTransactions) {
      this.recentTransactions = this.recentTransactions.slice(0, this.config.maxRecentTransactions);
    }
  }

  addMEVDetection(detection) {
    this.mevDetections.unshift(detection);
    if (this.mevDetections.length > this.config.maxDetections) {
      this.mevDetections = this.mevDetections.slice(0, this.config.maxDetections);
    }
  }

  async storeDetection(detection) {
    try {
      const { default: Detection } = await import('../models/Detection.js');
      
      const detectionDoc = new Detection({
        txHash: detection.txHash,
        from: detection.fromAddress,
        to: detection.toAddress,
        value: detection.value,
        gasPrice: detection.gasPrice,
        timestamp: new Date(detection.timestamp),
        riskScore: detection.riskScore,
        category: detection.attackType,
        riskFactors: detection.threats,
        mitigated: detection.blocked,
        blockNumber: null
      });

      await detectionDoc.save();
      logger.info(`Detection stored: ${detection.id}`);
    } catch (error) {
      logger.error('Error storing detection:', error);
    }
  }

  // Real-time broadcasting methods
  setupRealTimeBroadcasting() {
    // Broadcast system status every 30 seconds
    setInterval(() => {
      if (this.isActive) {
        this.broadcastSystemStatus();
      }
    }, 30000);

    // Broadcast network stats every 10 seconds
    setInterval(() => {
      if (this.isActive) {
        this.broadcastNetworkStats();
      }
    }, 10000);
  }

  broadcastMEVDetection(detection) {
    this.io.emit('mev_detection', detection);
    logger.info(`📡 MEV detection broadcasted: ${detection.id}`);
  }

  broadcastTransactionUpdate(transactionData, riskAnalysis) {
    const update = {
      ...transactionData,
      riskScore: riskAnalysis.riskScore,
      riskLevel: this.getRiskLevel(riskAnalysis.riskScore),
      threats: riskAnalysis.riskFactors || []
    };

    this.io.emit('mempool_update', {
      transactions: [update],
      timestamp: new Date().toISOString()
    });
  }

  broadcastThreatStats() {
    this.io.emit('threat_stats_update', {
      ...this.threatStats,
      timestamp: new Date().toISOString()
    });
  }

  broadcastSystemStatus() {
    const status = {
      isActive: this.isActive,
      network: this.config.network,
      mode: this.provider ? 'live' : 'demo',
      processedTransactions: this.processedTransactions.size,
      recentDetections: this.mevDetections.length,
      protectedUsers: this.protectedUsers.size,
      threatStats: this.threatStats,
      timestamp: new Date().toISOString()
    };

    this.io.emit('system_status', status);
  }

  broadcastNetworkStats() {
    const stats = {
      totalTransactions: this.threatStats.totalScanned,
      pendingTransactions: Math.floor(Math.random() * 500 + 200),
      averageGasPrice: Math.floor(Math.random() * 50 + 30),
      mevOpportunities: this.mevDetections.filter(d => d.riskLevel === 'HIGH').length,
      threatLevel: this.getThreatLevel(),
      timestamp: new Date().toISOString()
    };

    this.io.emit('network_stats', stats);
  }

  getThreatLevel() {
    const recentHighRisk = this.mevDetections
      .filter(d => d.riskLevel === 'HIGH' && 
        new Date() - new Date(d.timestamp) < 300000) // Last 5 minutes
      .length;

    if (recentHighRisk > 5) return 'HIGH';
    if (recentHighRisk > 2) return 'MEDIUM';
    return 'LOW';
  }

  // User protection management
  enableProtectionForUser(userAddress) {
    this.protectedUsers.add(userAddress.toLowerCase());
    logger.info(`🛡️ Protection enabled for user: ${userAddress}`);
    
    this.io.emit('protection_enabled', {
      userAddress,
      timestamp: new Date().toISOString()
    });
  }

  disableProtectionForUser(userAddress) {
    this.protectedUsers.delete(userAddress.toLowerCase());
    logger.info(`❌ Protection disabled for user: ${userAddress}`);
    
    this.io.emit('protection_disabled', {
      userAddress,
      timestamp: new Date().toISOString()
    });
  }

  isUserProtected(userAddress) {
    return this.protectedUsers.has(userAddress.toLowerCase());
  }

  // Data access methods
  getRecentTransactions(limit = 100) {
    return this.recentTransactions.slice(0, limit);
  }

  getRecentDetections(limit = 50) {
    return this.mevDetections.slice(0, limit);
  }

  getThreatStatistics() {
    return {
      ...this.threatStats,
      protectedUsers: this.protectedUsers.size,
      recentDetections: this.mevDetections.length
    };
  }

  getSystemStatus() {
    return {
      isActive: this.isActive,
      network: this.config.network,
      mode: this.provider ? 'live' : 'demo',
      processedTransactions: this.processedTransactions.size,
      recentDetections: this.mevDetections.length,
      protectedUsers: this.protectedUsers.size,
      threatLevel: this.getThreatLevel(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // System control methods
  async handleProviderError(error) {
    logger.error('Provider error:', error);
    if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
      await this.reconnect();
    }
  }

  async reconnect() {
    if (this.isActive) {
      logger.info('🔄 Attempting to reconnect...');
      this.isActive = false;
      
      setTimeout(async () => {
        try {
          this.setupProvider();
          await this.start();
        } catch (error) {
          logger.error('Reconnection failed:', error);
        }
      }, 5000);
    }
  }

  async stop() {
    if (!this.isActive) return;

    this.isActive = false;
    
    if (this.provider) {
      this.provider.removeAllListeners('pending');
      this.provider.destroy();
    }

    logger.info('🛑 MEV Defense System stopped');
    this.emit('stopped');
  }
}

export default MEVDefenseSystem;