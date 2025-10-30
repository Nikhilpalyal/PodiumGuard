import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class AIService {
  constructor() {
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5001';
    this.timeout = parseInt(process.env.AI_TIMEOUT || '5000');
    this.retryAttempts = parseInt(process.env.AI_RETRY_ATTEMPTS || '3');
    this.isInitialized = false;
    
    // Initialize axios instance with default config
    this.client = axios.create({
      baseURL: this.aiEngineUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`AI Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`AI Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('AI Service Response Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  async initialize() {
    try {
      logger.info('🤖 Initializing AI Service...');
      
      // Test connection to AI engine
      const isHealthy = await this.testConnection();
      
      if (isHealthy) {
        logger.info('✅ AI Service connected successfully');
        this.isInitialized = true;
      } else {
        logger.warn('⚠️ AI Service not available - will use mock analysis');
        this.isInitialized = false;
      }
      
      return this.isInitialized;
    } catch (error) {
      logger.error('❌ Failed to initialize AI Service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async analyzeTransaction(transactionData) {
    try {
      logger.info(`Analyzing transaction: ${transactionData.txHash}`);
      
      const response = await this.retryRequest(() =>
        this.client.post('/detect', transactionData)
      );

      const analysis = response.data;
      
      // Validate response format
      if (!this.isValidAnalysisResponse(analysis)) {
        throw new Error('Invalid analysis response format');
      }

      logger.info(`Analysis completed for ${transactionData.txHash}: ${analysis.riskScore}% risk`);
      
      return {
        riskScore: analysis.riskScore || 0,
        category: analysis.category || 'unknown',
        riskFactors: analysis.riskFactors || [],
        timestamp: analysis.timestamp || new Date().toISOString(),
        analysisDetails: analysis.analysis_details || {},
        processingTime: this.calculateProcessingTime(analysis.timestamp)
      };

    } catch (error) {
      logger.error(`Error analyzing transaction ${transactionData.txHash}:`, error.message);
      
      // Return safe default response on error
      return {
        riskScore: 0,
        category: 'error',
        riskFactors: ['analysis_failed'],
        timestamp: new Date().toISOString(),
        error: error.message,
        processingTime: 0
      };
    }
  }

  async retryRequest(requestFn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        logger.warn(`AI Service request attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        aiEngine: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('AI Service health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getStats() {
    try {
      const response = await this.client.get('/stats');
      return response.data;
    } catch (error) {
      logger.error('Error getting AI Service stats:', error.message);
      throw error;
    }
  }

  async updateMEVBots(addresses) {
    try {
      const response = await this.client.post('/update_mev_bots', {
        addresses: addresses
      });
      
      logger.info(`Updated ${addresses.length} MEV bot addresses`);
      return response.data;
    } catch (error) {
      logger.error('Error updating MEV bot addresses:', error.message);
      throw error;
    }
  }

  async simulateAttack(attackType, parameters = {}) {
    try {
      logger.info(`Simulating attack: ${attackType}`);
      
      // Generate synthetic transaction data based on attack type
      const syntheticTransaction = this.generateSyntheticTransaction(attackType, parameters);
      
      // Analyze the synthetic transaction
      const analysis = await this.analyzeTransaction(syntheticTransaction);
      
      return {
        ...analysis,
        simulated: true,
        attackType: attackType,
        parameters: parameters,
        syntheticTransaction: syntheticTransaction
      };
      
    } catch (error) {
      logger.error(`Error simulating attack ${attackType}:`, error.message);
      throw error;
    }
  }

  generateSyntheticTransaction(attackType, parameters) {
    const baseTransaction = {
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: parameters.from || '0x1234567890123456789012345678901234567890',
      to: parameters.to || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
      value: parameters.value || '1.0',
      nonce: Math.floor(Math.random() * 1000000),
      timestamp: new Date().toISOString(),
      blockNumber: null,
      type: 2
    };

    switch (attackType) {
      case 'frontrunning':
        return {
          ...baseTransaction,
          gasPrice: '150.0', // High gas price
          maxFeePerGas: '200.0',
          maxPriorityFeePerGas: '75.0',
          gasLimit: '300000',
          data: '0x38ed1739' + '0'.repeat(200) // swapExactTokensForTokens signature
        };

      case 'sandwich':
        return {
          ...baseTransaction,
          gasPrice: '300.0', // Very high gas price
          maxFeePerGas: '400.0',
          maxPriorityFeePerGas: '150.0',
          gasLimit: '500000',
          value: '50.0', // Large value
          data: '0x7ff36ab5' + '0'.repeat(200) // swapExactETHForTokens signature
        };

      case 'mev_bot':
        return {
          ...baseTransaction,
          from: '0x0000000000000000000000000000000000000000', // Known MEV bot address
          gasPrice: '100.0',
          maxFeePerGas: '150.0',
          maxPriorityFeePerGas: '50.0',
          gasLimit: '1000000',
          data: '0xa9059cbb' + '0'.repeat(200) // transfer signature
        };

      case 'arbitrage':
        return {
          ...baseTransaction,
          gasPrice: '80.0',
          maxFeePerGas: '120.0',
          maxPriorityFeePerGas: '30.0',
          gasLimit: '800000',
          value: '25.0',
          data: '0x095ea7b3' + '0'.repeat(200) // approve signature
        };

      default:
        return baseTransaction;
    }
  }

  isValidAnalysisResponse(analysis) {
    return (
      analysis &&
      typeof analysis.riskScore === 'number' &&
      analysis.riskScore >= 0 &&
      analysis.riskScore <= 100 &&
      typeof analysis.category === 'string' &&
      Array.isArray(analysis.riskFactors)
    );
  }

  calculateProcessingTime(analysisTimestamp) {
    try {
      const now = new Date();
      const analysisTime = new Date(analysisTimestamp);
      return now.getTime() - analysisTime.getTime();
    } catch (error) {
      return 0;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConfiguration() {
    return {
      aiEngineUrl: this.aiEngineUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    };
  }

  async testConnection() {
    try {
      await this.checkHealth();
      logger.info('AI Service connection test successful');
      return true;
    } catch (error) {
      logger.error('AI Service connection test failed:', error.message);
      return false;
    }
  }
}

export default AIService;