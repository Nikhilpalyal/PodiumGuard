import { ethers } from 'ethers';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.networkName = process.env.ETHEREUM_NETWORK || 'sepolia';
    
    this.initialize();
  }

  async initialize() {
    try {
      // Setup provider
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Setup signer if private key is provided
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        logger.info(`Contract service initialized with signer: ${this.signer.address}`);
      } else {
        logger.warn('No private key provided, contract will be read-only');
      }
      
      // Load contract address and ABI
      await this.loadContract();
      
    } catch (error) {
      logger.error('Error initializing contract service:', error);
      throw error;
    }
  }

  async loadContract() {
    try {
      // Load deployment info
      const deploymentPath = path.join(process.cwd(), 'deployments', `${this.networkName}.json`);
      
      if (fs.existsSync(deploymentPath)) {
        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        this.contractAddress = deploymentInfo.address;
        logger.info(`Loaded contract address: ${this.contractAddress}`);
      } else {
        logger.warn(`No deployment found for network: ${this.networkName}`);
        return;
      }
      
      // Load ABI from compiled contract
      const artifactPath = path.join(process.cwd(), 'artifacts/contracts/PodiumGuardDefense.sol/PodiumGuardDefense.json');
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        this.contractABI = artifact.abi;
        
        // Create contract instance
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer || this.provider
        );
        
        logger.info('Contract instance created successfully');
        
        // Setup event listeners
        this.setupEventListeners();
        
      } else {
        logger.warn('Contract artifact not found. Please compile the contract first.');
      }
      
    } catch (error) {
      logger.error('Error loading contract:', error);
    }
  }

  setupEventListeners() {
    if (!this.contract) return;

    try {
      // Listen for DetectionLogged events
      this.contract.on('DetectionLogged', (detectionId, txHash, from, to, riskScore, category, timestamp) => {
        logger.info(`Detection logged on-chain: ID ${detectionId}, Risk: ${riskScore}%`);
        
        // Broadcast to WebSocket clients if available
        if (global.io) {
          global.io.emit('contract_detection_logged', {
            detectionId: detectionId.toString(),
            txHash,
            from,
            to,
            riskScore: riskScore.toString(),
            category: this.getCategoryName(category),
            timestamp: new Date(Number(timestamp) * 1000).toISOString()
          });
        }
      });

      // Listen for SystemModeChanged events
      this.contract.on('SystemModeChanged', (previousMode, newMode, timestamp, reason) => {
        logger.warn(`System mode changed: ${this.getModeName(previousMode)} -> ${this.getModeName(newMode)} (${reason})`);
        
        if (global.io) {
          global.io.emit('system_mode_changed', {
            previousMode: this.getModeName(previousMode),
            newMode: this.getModeName(newMode),
            timestamp: new Date(Number(timestamp) * 1000).toISOString(),
            reason
          });
        }
      });

      // Listen for HighRiskAlert events
      this.contract.on('HighRiskAlert', (detectionId, txHash, riskScore, category, timestamp) => {
        logger.warn(`High-risk alert from contract: ${txHash} (${riskScore}%)`);
        
        if (global.io) {
          global.io.emit('contract_high_risk_alert', {
            detectionId: detectionId.toString(),
            txHash,
            riskScore: riskScore.toString(),
            category: this.getCategoryName(category),
            timestamp: new Date(Number(timestamp) * 1000).toISOString()
          });
        }
      });

      // Listen for EmergencyTriggered events
      this.contract.on('EmergencyTriggered', (detectionCount, timeWindow, timestamp) => {
        logger.error(`Emergency triggered! ${detectionCount} detections in ${timeWindow} seconds`);
        
        if (global.io) {
          global.io.emit('emergency_triggered', {
            detectionCount: detectionCount.toString(),
            timeWindow: timeWindow.toString(),
            timestamp: new Date(Number(timestamp) * 1000).toISOString()
          });
        }
      });

      logger.info('Contract event listeners setup successfully');
      
    } catch (error) {
      logger.error('Error setting up contract event listeners:', error);
    }
  }

  async logDetection(transactionData, riskAnalysis) {
    if (!this.contract || !this.signer) {
      logger.warn('Cannot log detection - contract not initialized or no signer');
      return false;
    }

    try {
      logger.info(`Logging detection to contract: ${transactionData.txHash}`);

      // Convert category to enum value
      const categoryEnum = this.getCategoryEnum(riskAnalysis.category);
      
      // Prepare risk factors (limit to prevent gas issues)
      const riskFactors = riskAnalysis.riskFactors.slice(0, 10); // Limit to 10 factors
      
      // Convert value to wei if it's in ETH
      const valueInWei = ethers.parseEther(transactionData.value.toString());
      
      // Call the contract function
      const tx = await this.contract.logDetection(
        transactionData.txHash,
        transactionData.from,
        transactionData.to,
        valueInWei,
        Math.floor(riskAnalysis.riskScore),
        categoryEnum,
        riskFactors,
        {
          gasLimit: 500000, // Set gas limit to prevent out-of-gas errors
        }
      );

      logger.info(`Detection logged, transaction hash: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.info(`Detection confirmed in block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Error logging detection to contract:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async setSystemMode(mode, reason) {
    if (!this.contract || !this.signer) {
      logger.warn('Cannot set system mode - contract not initialized or no signer');
      return false;
    }

    try {
      const modeEnum = this.getModeEnum(mode);
      
      const tx = await this.contract.setSystemMode(modeEnum, reason, {
        gasLimit: 100000
      });

      logger.info(`System mode set to ${mode}, transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      logger.error('Error setting system mode:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async mitigateDetection(detectionId) {
    if (!this.contract || !this.signer) {
      logger.warn('Cannot mitigate detection - contract not initialized or no signer');
      return false;
    }

    try {
      const tx = await this.contract.mitigateDetection(detectionId, {
        gasLimit: 100000
      });

      logger.info(`Detection ${detectionId} mitigated, transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      logger.error('Error mitigating detection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSystemStats() {
    if (!this.contract) {
      logger.warn('Cannot get system stats - contract not initialized');
      return null;
    }

    try {
      const stats = await this.contract.getSystemStats();
      
      return {
        totalDetections: stats[0].toString(),
        highRiskDetections: stats[1].toString(),
        currentMode: this.getModeName(stats[2]),
        categoryCounts: {
          normal: stats[3][0].toString(),
          frontrunning: stats[3][1].toString(),
          sandwich: stats[3][2].toString(),
          mevBot: stats[3][3].toString(),
          arbitrage: stats[3][4].toString(),
          highRisk: stats[3][5].toString()
        }
      };

    } catch (error) {
      logger.error('Error getting system stats:', error);
      return null;
    }
  }

  async getDetection(detectionId) {
    if (!this.contract) {
      logger.warn('Cannot get detection - contract not initialized');
      return null;
    }

    try {
      const detection = await this.contract.getDetection(detectionId);
      const riskFactors = await this.contract.getDetectionRiskFactors(detectionId);
      
      return {
        id: detection[0].toString(),
        txHash: detection[1],
        from: detection[2],
        to: detection[3],
        value: ethers.formatEther(detection[4]),
        riskScore: detection[5].toString(),
        category: this.getCategoryName(detection[6]),
        timestamp: new Date(Number(detection[7]) * 1000).toISOString(),
        mitigated: detection[8],
        riskFactors: riskFactors
      };

    } catch (error) {
      logger.error('Error getting detection:', error);
      return null;
    }
  }

  async getCurrentMode() {
    if (!this.contract) return 'unknown';

    try {
      const mode = await this.contract.currentMode();
      return this.getModeName(mode);
    } catch (error) {
      logger.error('Error getting current mode:', error);
      return 'unknown';
    }
  }

  // Helper methods for enum conversions
  getCategoryEnum(category) {
    const mapping = {
      'normal': 0,
      'frontrunning': 1,
      'sandwich': 2,
      'mev_bot': 3,
      'arbitrage': 4,
      'high_risk': 5
    };
    return mapping[category] || 0;
  }

  getCategoryName(enumValue) {
    const mapping = ['normal', 'frontrunning', 'sandwich', 'mev_bot', 'arbitrage', 'high_risk'];
    return mapping[enumValue] || 'normal';
  }

  getModeEnum(mode) {
    const mapping = {
      'normal': 0,
      'safe': 1,
      'emergency': 2
    };
    return mapping[mode.toLowerCase()] || 0;
  }

  getModeName(enumValue) {
    const mapping = ['Normal', 'Safe', 'Emergency'];
    return mapping[enumValue] || 'Normal';
  }

  async isHealthy() {
    try {
      if (!this.contract) return false;
      
      // Try to call a simple read function
      await this.contract.currentMode();
      return true;
    } catch (error) {
      return false;
    }
  }

  getContractInfo() {
    return {
      address: this.contractAddress,
      network: this.networkName,
      hasContract: !!this.contract,
      hasSigner: !!this.signer,
      signerAddress: this.signer?.address || null
    };
  }
}

export default ContractService;