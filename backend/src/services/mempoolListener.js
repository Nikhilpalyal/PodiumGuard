import { ethers } from 'ethers';
import winston from 'winston';
import EventEmitter from 'events';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class MempoolListener extends EventEmitter {
  constructor(aiService, contractService, safeModeService, io) {
    super();
    this.aiService = aiService;
    this.contractService = contractService;
    this.safeModeService = safeModeService;
    this.io = io;
    this.isListening = false;
    this.provider = null;
    this.processedTransactions = new Set();
    this.recentTransactions = [];
    this.maxRecentTransactions = 1000;
    
    // Configuration
    this.config = {
      network: process.env.ETHEREUM_NETWORK || 'sepolia',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'wss://sepolia.infura.io/ws/v3/YOUR_INFURA_KEY',
      minValue: ethers.parseEther(process.env.MIN_TRANSACTION_VALUE || '0.001'), // Minimum ETH value to process
      gasThreshold: parseInt(process.env.GAS_THRESHOLD || '50000'), // Minimum gas to process
    };

    this.setupProvider();
  }

  setupProvider() {
    // For demo purposes, skip WebSocket connection that requires API keys
    logger.info('Mempool listener initialized in demo mode');
    logger.info('For live data, configure ETHEREUM_RPC_URL with a valid WebSocket endpoint');
    this.provider = null; // Demo mode - no live provider
  }

  async reconnect() {
    if (this.isListening) {
      this.isListening = false;
      setTimeout(() => {
        this.setupProvider();
        this.start();
      }, 5000);
    }
  }

  async start() {
    if (this.isListening) {
      logger.warn('Mempool listener is already running');
      return;
    }

    try {
      this.isListening = true;
      logger.info('Starting mempool listener...');

      // Check if provider is available
      if (!this.provider) {
        logger.info('No provider available - running in demo mode');
        logger.info('Mempool listener started in demo mode (no live data)');
        return;
      }

      // Listen for pending transactions
      this.provider.on('pending', async (txHash) => {
        if (!this.isListening || this.processedTransactions.has(txHash)) {
          return;
        }

        this.processedTransactions.add(txHash);
        
        // Clean up old processed transactions to prevent memory leak
        if (this.processedTransactions.size > 10000) {
          const oldTxs = Array.from(this.processedTransactions).slice(0, 5000);
          oldTxs.forEach(tx => this.processedTransactions.delete(tx));
        }

        try {
          await this.processTransaction(txHash);
        } catch (error) {
          logger.error(`Error processing transaction ${txHash}:`, error);
        }
      });

      logger.info('Mempool listener started successfully');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start mempool listener:', error);
      this.isListening = false;
      throw error;
    }
  }

  async processTransaction(txHash) {
    try {
      // Get transaction details
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        return;
      }

      // Filter transactions based on criteria
      if (!this.shouldProcessTransaction(tx)) {
        return;
      }

      // Extract transaction data
      const transactionData = this.extractTransactionData(tx);
      
      // Add to recent transactions
      this.addToRecentTransactions(transactionData);

      // Send to AI for risk analysis
      const riskAnalysis = await this.aiService.analyzeTransaction(transactionData);
      
      if (riskAnalysis.riskScore > 0) {
        logger.info(`Transaction ${txHash} has risk score: ${riskAnalysis.riskScore}%`);
        
        // Store detection in database
        await this.storeDetection(transactionData, riskAnalysis);
        
        // Broadcast to WebSocket clients
        this.broadcastDetection(transactionData, riskAnalysis);
        
        // Check if high risk (>75%)
        if (riskAnalysis.riskScore > 75) {
          logger.warn(`High-risk transaction detected: ${txHash} (${riskAnalysis.riskScore}%)`);
          
          // Log to smart contract
          await this.contractService.logDetection(transactionData, riskAnalysis);
          
          // Check safe mode trigger
          this.safeModeService.recordDetection(riskAnalysis.riskScore);
          
          // Broadcast high-risk alert
          this.broadcastHighRiskAlert(transactionData, riskAnalysis);
        }
      }

    } catch (error) {
      logger.error(`Error processing transaction ${txHash}:`, error);
    }
  }

  shouldProcessTransaction(tx) {
    // Skip if no value
    if (!tx.value || tx.value === 0n) {
      return false;
    }

    // Skip small transactions
    if (tx.value < this.config.minValue) {
      return false;
    }

    // Skip low gas transactions
    if (!tx.gasLimit || tx.gasLimit < this.config.gasThreshold) {
      return false;
    }

    // Skip contract creation transactions for now
    if (!tx.to) {
      return false;
    }

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
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : null,
      gasLimit: tx.gasLimit.toString(),
      nonce: tx.nonce,
      data: tx.data,
      timestamp: new Date().toISOString(),
      blockNumber: tx.blockNumber,
      type: tx.type
    };
  }

  addToRecentTransactions(transactionData) {
    this.recentTransactions.unshift(transactionData);
    if (this.recentTransactions.length > this.maxRecentTransactions) {
      this.recentTransactions = this.recentTransactions.slice(0, this.maxRecentTransactions);
    }
  }

  async storeDetection(transactionData, riskAnalysis) {
    try {
      const { default: Detection } = await import('../models/Detection.js');
      
      const detection = new Detection({
        txHash: transactionData.txHash,
        from: transactionData.from,
        to: transactionData.to,
        value: transactionData.value,
        gasPrice: transactionData.gasPrice,
        nonce: transactionData.nonce,
        timestamp: new Date(transactionData.timestamp),
        riskScore: riskAnalysis.riskScore,
        category: riskAnalysis.category,
        riskFactors: riskAnalysis.riskFactors,
        mitigated: false,
        blockNumber: transactionData.blockNumber
      });

      await detection.save();
      logger.info(`Detection stored for transaction ${transactionData.txHash}`);
    } catch (error) {
      logger.error('Error storing detection:', error);
    }
  }

  broadcastDetection(transactionData, riskAnalysis) {
    const detectionData = {
      ...transactionData,
      riskScore: riskAnalysis.riskScore,
      category: riskAnalysis.category,
      riskFactors: riskAnalysis.riskFactors,
      timestamp: new Date().toISOString()
    };

    this.io.to('detections').emit('new_detection', detectionData);
  }

  broadcastHighRiskAlert(transactionData, riskAnalysis) {
    const alertData = {
      type: 'HIGH_RISK_ALERT',
      transaction: transactionData,
      riskScore: riskAnalysis.riskScore,
      category: riskAnalysis.category,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    };

    this.io.emit('high_risk_alert', alertData);
    logger.warn(`High-risk alert broadcasted for ${transactionData.txHash}`);
  }

  stop() {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.provider.removeAllListeners('pending');
    logger.info('Mempool listener stopped');
    this.emit('stopped');
  }

  getRecentTransactions(limit = 100) {
    return this.recentTransactions.slice(0, limit);
  }

  getStatus() {
    return {
      isListening: this.isListening,
      network: this.config.network,
      processedCount: this.processedTransactions.size,
      recentTransactionsCount: this.recentTransactions.length
    };
  }
}

export default MempoolListener;