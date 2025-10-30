import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import BlockchainEventMonitor from './blockchainEventMonitor.js';

/**
 * Enhanced Contract Service with Advanced MEV Defense Integration
 * Supports multi-contract architecture with AI oracle integration
 */
class EnhancedContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = new Map();
    this.isInitialized = false;
    this.eventMonitor = null;
    this.networkInfo = null;
    
    this.config = {
      network: process.env.ETHEREUM_NETWORK || 'sepolia',
      gasLimit: process.env.GAS_LIMIT || '300000',
      gasPrice: process.env.GAS_PRICE || '20000000000', // 20 gwei
      confirmations: parseInt(process.env.CONFIRMATIONS || '1'),
    };

    // Contract addresses (would be loaded from deployment or environment)
    this.contractAddresses = {
      PodiumGuardCore: process.env.CORE_CONTRACT_ADDRESS || '',
      AIOracle: process.env.AI_ORACLE_ADDRESS || '',
      AutomatedDefenseSystem: process.env.DEFENSE_SYSTEM_ADDRESS || '',
      DecentralizedOracleNetwork: process.env.ORACLE_NETWORK_ADDRESS || ''
    };
  }

  /**
   * Initialize the contract service with blockchain connection
   */
  async initialize() {
    try {
      // Setup provider
      await this.setupProvider();
      
      // Setup signer for transactions
      await this.setupSigner();
      
      // Load all contracts
      await this.loadContracts();
      
      // Initialize event monitoring
      await this.initializeEventMonitoring();
      
      this.isInitialized = true;
      
      logger.info('Enhanced Contract Service initialized successfully', {
        network: this.config.network,
        contractsLoaded: this.contracts.size,
        signerAddress: await this.signer?.getAddress()
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw error;
    }
  }

  /**
   * Setup blockchain provider
   */
  async setupProvider() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';
    
    try {
      if (rpcUrl.includes('wss://')) {
        this.provider = new ethers.WebSocketProvider(rpcUrl);
      } else {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      }

      // Test connection
      this.networkInfo = await this.provider.getNetwork();
      
      logger.info('Provider connected', {
        chainId: this.networkInfo.chainId.toString(),
        name: this.networkInfo.name
      });

    } catch (error) {
      logger.warn('Primary provider failed, using fallback', { error: error.message });
      // Fallback to local or alternative provider
      this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
    }
  }

  /**
   * Setup transaction signer
   */
  async setupSigner() {
    const privateKey = process.env.PRIVATE_KEY;
    
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      const address = await this.signer.getAddress();
      
      logger.info('Signer initialized', { 
        address,
        balance: ethers.formatEther(await this.provider.getBalance(address))
      });
    } else {
      logger.warn('No private key provided - read-only mode');
    }
  }

  /**
   * Load all smart contracts
   */
  async loadContracts() {
    const contractConfigs = [
      {
        name: 'PodiumGuardCore',
        address: this.contractAddresses.PodiumGuardCore,
        requiredMethods: ['submitMEVDetection', 'enableProtection', 'getSystemStats']
      },
      {
        name: 'AIOracle',
        address: this.contractAddresses.AIOracle,
        requiredMethods: ['submitAnalysis', 'submitBatchAnalysis', 'getOracleInfo']
      },
      {
        name: 'AutomatedDefenseSystem',
        address: this.contractAddresses.AutomatedDefenseSystem,
        requiredMethods: ['analyzeAndProtect', 'executeDelayedTransaction', 'getProtectionStats']
      },
      {
        name: 'DecentralizedOracleNetwork',
        address: this.contractAddresses.DecentralizedOracleNetwork,
        requiredMethods: ['requestConsensus', 'submitResponse', 'getNetworkStats']
      }
    ];

    for (const config of contractConfigs) {
      await this.loadContract(config);
    }
  }

  /**
   * Load a specific contract
   */
  async loadContract(config) {
    try {
      if (!config.address) {
        logger.warn(`No address configured for ${config.name}`);
        return;
      }

      // Load ABI from compiled artifacts
      const abi = await this.loadContractABI(config.name);
      if (!abi) {
        logger.warn(`Could not load ABI for ${config.name}`);
        return;
      }

      // Create contract instance
      const contract = new ethers.Contract(
        config.address,
        abi,
        this.signer || this.provider
      );

      // Verify contract is deployed
      const code = await this.provider.getCode(config.address);
      if (code === '0x') {
        logger.warn(`Contract ${config.name} not deployed at ${config.address}`);
        return;
      }

      // Verify required methods exist
      for (const method of config.requiredMethods) {
        if (!contract[method]) {
          logger.warn(`Method ${method} not found in ${config.name}`);
        }
      }

      this.contracts.set(config.name, contract);
      logger.info(`Loaded contract: ${config.name}`, { 
        address: config.address,
        hasAllMethods: config.requiredMethods.every(m => !!contract[m])
      });

    } catch (error) {
      logger.error(`Failed to load contract ${config.name}:`, error);
    }
  }

  /**
   * Load contract ABI from compiled artifacts
   */
  async loadContractABI(contractName) {
    try {
      const artifact = await import(`../../artifacts/contracts/${contractName}.sol/${contractName}.json`, {
        assert: { type: 'json' }
      });
      return artifact.default.abi;
    } catch (error) {
      // Try alternative path for complex contract structure
      try {
        const artifact = await import(`../../artifacts/contracts/${contractName}.json`, {
          assert: { type: 'json' }
        });
        return artifact.default.abi;
      } catch (secondError) {
        logger.warn(`Could not load ABI for ${contractName}`, { 
          error: error.message,
          secondError: secondError.message 
        });
        return null;
      }
    }
  }

  /**
   * Initialize blockchain event monitoring
   */
  async initializeEventMonitoring() {
    try {
      this.eventMonitor = new BlockchainEventMonitor({
        network: this.config.network,
        confirmations: this.config.confirmations
      });

      // Setup event listeners
      this.eventMonitor.on('mevDetected', this.handleMEVDetected.bind(this));
      this.eventMonitor.on('protectionActivated', this.handleProtectionActivated.bind(this));
      this.eventMonitor.on('emergencyMode', this.handleEmergencyMode.bind(this));
      this.eventMonitor.on('consensusReached', this.handleConsensusReached.bind(this));

      await this.eventMonitor.initialize();
      await this.eventMonitor.startMonitoring();
    } catch (error) {
      logger.warn('Event monitoring initialization failed:', error);
      // Continue without event monitoring
    }
  }

  /**
   * Submit MEV detection to the core contract
   */
  async submitMEVDetection(detectionData) {
    try {
      const coreContract = this.contracts.get('PodiumGuardCore');
      if (!coreContract || !this.signer) {
        throw new Error('PodiumGuardCore contract not available or no signer');
      }

      const {
        detectionId,
        targetAddress,
        transactionHash,
        attackType,
        riskScore,
        confidence
      } = detectionData;

      // Create signature for verification
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'bytes32', 'uint256', 'uint256', 'uint256'],
          [detectionId, targetAddress, transactionHash, attackType, riskScore, confidence]
        )
      );

      const signature = await this.signer.signMessage(ethers.getBytes(messageHash));

      const tx = await coreContract.submitMEVDetection(
        detectionId,
        targetAddress,
        transactionHash,
        attackType,
        riskScore,
        confidence,
        signature,
        {
          gasLimit: this.config.gasLimit,
          gasPrice: this.config.gasPrice
        }
      );

      logger.info('MEV detection submitted to blockchain', {
        detectionId,
        riskScore,
        attackType,
        txHash: tx.hash
      });

      return tx;
    } catch (error) {
      logger.error('Failed to submit MEV detection:', error);
      throw error;
    }
  }

  /**
   * Submit AI analysis to oracle contract
   */
  async submitAIAnalysis(analysisData) {
    try {
      const oracleContract = this.contracts.get('AIOracle');
      if (!oracleContract || !this.signer) {
        throw new Error('AIOracle contract not available or no signer');
      }

      const {
        analysisId,
        transactionHash,
        riskScore,
        confidence,
        modelVersion,
        inputDataHash
      } = analysisData;

      // Create signature
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'bytes32', 'uint256', 'uint256', 'string', 'bytes32', 'uint256'],
          [analysisId, transactionHash, riskScore, confidence, modelVersion, inputDataHash, this.networkInfo.chainId]
        )
      );

      const signature = await this.signer.signMessage(ethers.getBytes(messageHash));

      const tx = await oracleContract.submitAnalysis(
        analysisId,
        transactionHash,
        riskScore,
        confidence,
        modelVersion,
        inputDataHash,
        signature,
        {
          gasLimit: this.config.gasLimit,
          gasPrice: this.config.gasPrice
        }
      );

      logger.info('AI analysis submitted to oracle', {
        analysisId,
        riskScore,
        confidence,
        txHash: tx.hash
      });

      return tx;
    } catch (error) {
      logger.error('Failed to submit AI analysis:', error);
      throw error;
    }
  }

  /**
   * Request consensus from oracle network
   */
  async requestOracleConsensus(transactionHash, requiredConsensus = 3, timeout = 60) {
    try {
      const networkContract = this.contracts.get('DecentralizedOracleNetwork');
      if (!networkContract || !this.signer) {
        throw new Error('DecentralizedOracleNetwork contract not available or no signer');
      }

      const value = ethers.parseEther('0.01'); // Payment for oracles

      const tx = await networkContract.requestConsensus(
        transactionHash,
        requiredConsensus,
        timeout,
        {
          value,
          gasLimit: this.config.gasLimit,
          gasPrice: this.config.gasPrice
        }
      );

      const receipt = await tx.wait();
      
      // Extract request ID from event logs
      const event = receipt.logs.find(log => {
        try {
          const parsed = networkContract.interface.parseLog(log);
          return parsed.name === 'ConsensusRequested';
        } catch {
          return false;
        }
      });

      const requestId = event ? networkContract.interface.parseLog(event).args.requestId : null;

      logger.info('Oracle consensus requested', {
        transactionHash,
        requestId,
        requiredConsensus,
        timeout,
        txHash: tx.hash
      });

      return { tx, requestId };
    } catch (error) {
      logger.error('Failed to request oracle consensus:', error);
      throw error;
    }
  }

  /**
   * Event handlers
   */
  async handleMEVDetected(eventData) {
    logger.info('MEV Detection Event received from blockchain', eventData);
    
    // Forward to other services (WebSocket, database, etc.)
    // This would integrate with your existing service architecture
  }

  async handleProtectionActivated(eventData) {
    logger.info('Protection Activation Event received', eventData);
    
    // Handle protection logic
  }

  async handleEmergencyMode(eventData) {
    logger.error('Emergency Mode Event received', eventData);
    
    // Trigger emergency protocols
  }

  async handleConsensusReached(eventData) {
    logger.info('Oracle Consensus Reached', eventData);
    
    // Process consensus result
  }

  /**
   * Get contract statistics and status
   */
  async getSystemStatus() {
    try {
      const status = {
        network: this.networkInfo ? this.networkInfo.name : 'disconnected',
        contracts: {},
        eventMonitoring: this.eventMonitor ? this.eventMonitor.getStatus() : null,
        lastBlockNumber: await this.provider?.getBlockNumber() || 0
      };

      // Get status from each contract
      for (const [name, contract] of this.contracts) {
        try {
          if (name === 'PodiumGuardCore' && contract.getSystemStats) {
            const stats = await contract.getSystemStats();
            status.contracts[name] = {
              mode: stats.mode,
              totalDetections: stats.totalDet?.toString() || '0',
              totalProtected: stats.totalProt?.toString() || '0',
              totalStaked: stats.totalStaked ? ethers.formatEther(stats.totalStaked) : '0'
            };
          } else if (name === 'DecentralizedOracleNetwork' && contract.getNetworkStats) {
            const networkStats = await contract.getNetworkStats();
            status.contracts[name] = {
              totalOracles: networkStats.totalOracles?.toString() || '0',
              totalRequests: networkStats.totalRequestsProcessed?.toString() || '0',
              averageResponseTime: networkStats.averageResponseTime?.toString() || '0',
              consensusAccuracy: networkStats.consensusAccuracy?.toString() || '0'
            };
          } else {
            status.contracts[name] = { status: 'loaded', hasContract: true };
          }
        } catch (error) {
          status.contracts[name] = { error: error.message };
        }
      }

      return status;
    } catch (error) {
      logger.error('Failed to get system status:', error);
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  getContract(contractName) {
    return this.contracts.get(contractName);
  }

  /**
   * Check if service is properly initialized
   */
  isReady() {
    return this.isInitialized && this.provider && this.contracts.size > 0;
  }

  /**
   * Cleanup resources
   */
  async shutdown() {
    if (this.eventMonitor) {
      await this.eventMonitor.stopMonitoring();
    }

    if (this.provider && this.provider.removeAllListeners) {
      this.provider.removeAllListeners();
    }

    logger.info('Enhanced contract service shutdown complete');
  }
}

export default EnhancedContractService;