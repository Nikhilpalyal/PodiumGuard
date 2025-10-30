import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

/**
 * Blockchain Event Monitor - Advanced integration with smart contracts
 * Monitors all contract events and coordinates responses
 */
class BlockchainEventMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.provider = null;
    this.contracts = new Map();
    this.eventFilters = new Map();
    this.isMonitoring = false;
    this.lastProcessedBlock = 0;
    this.config = {
      network: options.network || 'sepolia',
      confirmations: options.confirmations || 1,
      batchSize: options.batchSize || 100,
      retryAttempts: options.retryAttempts || 3,
      ...options
    };

    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  /**
   * Initialize the blockchain monitor
   */
  async initialize() {
    try {
      // Setup provider
      const providerUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';
      this.provider = new ethers.JsonRpcProvider(providerUrl);

      // Get network info
      const network = await this.provider.getNetwork();
      logger.info('Connected to blockchain network', { 
        chainId: network.chainId.toString(),
        name: network.name 
      });

      // Load contract configurations
      await this.loadContracts();

      // Start monitoring from the latest block
      this.lastProcessedBlock = await this.provider.getBlockNumber();
      
      logger.info('Blockchain Event Monitor initialized', {
        network: this.config.network,
        currentBlock: this.lastProcessedBlock
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize blockchain monitor:', error);
      throw error;
    }
  }

  /**
   * Load smart contract configurations
   */
  async loadContracts() {
    const contractConfigs = [
      {
        name: 'PodiumGuardCore',
        address: process.env.CORE_CONTRACT_ADDRESS,
        abi: await this.loadABI('PodiumGuardCore')
      },
      {
        name: 'AIOracle',
        address: process.env.AI_ORACLE_ADDRESS,
        abi: await this.loadABI('AIOracle')
      },
      {
        name: 'AutomatedDefenseSystem',
        address: process.env.DEFENSE_SYSTEM_ADDRESS,
        abi: await this.loadABI('AutomatedDefenseSystem')
      },
      {
        name: 'DecentralizedOracleNetwork',
        address: process.env.ORACLE_NETWORK_ADDRESS,
        abi: await this.loadABI('DecentralizedOracleNetwork')
      }
    ];

    for (const config of contractConfigs) {
      if (config.address && config.abi) {
        const contract = new ethers.Contract(config.address, config.abi, this.provider);
        this.contracts.set(config.name, contract);
        await this.setupContractEventFilters(config.name, contract);
        logger.info(`Loaded contract: ${config.name}`, { address: config.address });
      }
    }
  }

  /**
   * Setup event filters for a contract
   */
  async setupContractEventFilters(contractName, contract) {
    const filters = [];

    // Core contract events
    if (contractName === 'PodiumGuardCore') {
      filters.push(
        contract.filters.MEVDetected(),
        contract.filters.ProtectionActivated(),
        contract.filters.ModeChanged(),
        contract.filters.EmergencyAction()
      );
    }

    // AI Oracle events
    if (contractName === 'AIOracle') {
      filters.push(
        contract.filters.AnalysisSubmitted(),
        contract.filters.BatchAnalysisSubmitted(),
        contract.filters.OracleSlashed()
      );
    }

    // Defense System events
    if (contractName === 'AutomatedDefenseSystem') {
      filters.push(
        contract.filters.ProtectionTriggered(),
        contract.filters.TransactionDelayed(),
        contract.filters.CircuitBreakerActivated()
      );
    }

    // Oracle Network events
    if (contractName === 'DecentralizedOracleNetwork') {
      filters.push(
        contract.filters.ConsensusRequested(),
        contract.filters.ConsensusReached(),
        contract.filters.DisputeRaised()
      );
    }

    this.eventFilters.set(contractName, filters);
  }

  /**
   * Load contract ABI from compiled artifacts
   */
  async loadABI(contractName) {
    try {
      const artifact = await import(`../../artifacts/contracts/${contractName}.sol/${contractName}.json`, {
        assert: { type: 'json' }
      });
      return artifact.default.abi;
    } catch (error) {
      logger.warn(`Could not load ABI for ${contractName}`, { error: error.message });
      return null;
    }
  }

  /**
   * Setup event handlers for different contract events
   */
  setupEventHandlers() {
    // MEV Detection Events
    this.eventHandlers.set('MEVDetected', async (event) => {
      const { detectionId, targetAddress, attackType, riskScore, action } = event.args;
      
      logger.info('MEV Attack Detected On-Chain', {
        detectionId,
        targetAddress,
        attackType,
        riskScore: riskScore.toString(),
        action,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });

      // Emit to other services
      this.emit('mevDetected', {
        detectionId,
        targetAddress,
        attackType,
        riskScore: parseInt(riskScore.toString()),
        action,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: new Date()
      });

      // Trigger immediate response if high risk
      if (parseInt(riskScore.toString()) >= 90) {
        await this.handleHighRiskEvent(event);
      }
    });

    // Protection Activation Events
    this.eventHandlers.set('ProtectionActivated', async (event) => {
      const { user, transactionHash, action, delay } = event.args;
      
      logger.info('User Protection Activated', {
        user,
        transactionHash,
        action,
        delay: delay.toString(),
        blockNumber: event.blockNumber
      });

      this.emit('protectionActivated', {
        user,
        transactionHash,
        action,
        delay: parseInt(delay.toString()),
        blockNumber: event.blockNumber,
        timestamp: new Date()
      });
    });

    // Mode Change Events
    this.eventHandlers.set('ModeChanged', async (event) => {
      const { oldMode, newMode, reason } = event.args;
      
      logger.warn('System Mode Changed', {
        oldMode,
        newMode,
        reason,
        blockNumber: event.blockNumber
      });

      this.emit('modeChanged', {
        oldMode,
        newMode,
        reason,
        blockNumber: event.blockNumber,
        timestamp: new Date()
      });

      // Handle emergency mode activation
      if (newMode === 3) { // Emergency mode
        await this.handleEmergencyMode(event);
      }
    });

    // Consensus Events
    this.eventHandlers.set('ConsensusReached', async (event) => {
      const { requestId, riskScore, confidence } = event.args;
      
      logger.info('Oracle Consensus Reached', {
        requestId,
        riskScore: riskScore.toString(),
        confidence: confidence.toString(),
        blockNumber: event.blockNumber
      });

      this.emit('consensusReached', {
        requestId,
        riskScore: parseInt(riskScore.toString()),
        confidence: parseInt(confidence.toString()),
        blockNumber: event.blockNumber,
        timestamp: new Date()
      });
    });

    // Circuit Breaker Events
    this.eventHandlers.set('CircuitBreakerActivated', async (event) => {
      const { target, duration, reason, triggeredBy } = event.args;
      
      logger.warn('Circuit Breaker Activated', {
        target,
        duration: duration.toString(),
        reason,
        triggeredBy,
        blockNumber: event.blockNumber
      });

      this.emit('circuitBreakerActivated', {
        target,
        duration: parseInt(duration.toString()),
        reason,
        triggeredBy,
        blockNumber: event.blockNumber,
        timestamp: new Date()
      });
    });
  }

  /**
   * Start monitoring blockchain events
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Event monitoring already active');
      return;
    }

    try {
      this.isMonitoring = true;
      
      // Setup event listeners for all contracts
      for (const [contractName, contract] of this.contracts) {
        const filters = this.eventFilters.get(contractName);
        
        for (const filter of filters) {
          contract.on(filter, async (...args) => {
            const event = args[args.length - 1]; // Last argument is the event object
            await this.processEvent(event);
          });
        }
        
        logger.info(`Started monitoring events for ${contractName}`);
      }

      // Start block monitoring for missed events
      this.provider.on('block', async (blockNumber) => {
        await this.processNewBlock(blockNumber);
      });

      logger.info('Blockchain event monitoring started', {
        contractsMonitored: this.contracts.size,
        startingBlock: this.lastProcessedBlock
      });

    } catch (error) {
      this.isMonitoring = false;
      logger.error('Failed to start event monitoring:', error);
      throw error;
    }
  }

  /**
   * Process a blockchain event
   */
  async processEvent(event) {
    try {
      const eventName = event.event || event.fragment?.name;
      const handler = this.eventHandlers.get(eventName);
      
      if (handler) {
        await handler(event);
      } else {
        logger.debug('Unhandled event', { eventName, event: event.args });
      }

      // Update last processed block
      if (event.blockNumber > this.lastProcessedBlock) {
        this.lastProcessedBlock = event.blockNumber;
      }

    } catch (error) {
      logger.error('Error processing blockchain event:', error, { event });
    }
  }

  /**
   * Process new blocks to catch missed events
   */
  async processNewBlock(blockNumber) {
    try {
      // Check for missed events in recent blocks
      if (blockNumber > this.lastProcessedBlock + 10) {
        await this.catchUpMissedEvents(this.lastProcessedBlock + 1, blockNumber - 1);
      }

      // Emit block event for other services
      this.emit('newBlock', {
        blockNumber,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Error processing new block:', error, { blockNumber });
    }
  }

  /**
   * Catch up on missed events
   */
  async catchUpMissedEvents(fromBlock, toBlock) {
    logger.info('Catching up on missed events', { fromBlock, toBlock });

    for (const [contractName, contract] of this.contracts) {
      const filters = this.eventFilters.get(contractName);
      
      for (const filter of filters) {
        try {
          const events = await contract.queryFilter(filter, fromBlock, toBlock);
          
          for (const event of events) {
            await this.processEvent(event);
          }
          
        } catch (error) {
          logger.error(`Error querying events for ${contractName}:`, error);
        }
      }
    }
  }

  /**
   * Handle high-risk events requiring immediate response
   */
  async handleHighRiskEvent(event) {
    logger.warn('High-risk event detected - triggering emergency response', {
      event: event.event,
      args: event.args,
      blockNumber: event.blockNumber
    });

    // Emit urgent event
    this.emit('urgentThreat', {
      event,
      severity: 'HIGH',
      requiresImmediateAction: true,
      timestamp: new Date()
    });

    // Additional automated responses could be triggered here
  }

  /**
   * Handle emergency mode activation
   */
  async handleEmergencyMode(event) {
    logger.error('EMERGENCY MODE ACTIVATED', {
      reason: event.args.reason,
      blockNumber: event.blockNumber
    });

    // Emit emergency alert
    this.emit('emergencyMode', {
      reason: event.args.reason,
      blockNumber: event.blockNumber,
      timestamp: new Date()
    });

    // Could trigger additional emergency protocols here
  }

  /**
   * Submit transaction to blockchain
   */
  async submitTransaction(contractName, methodName, args, options = {}) {
    try {
      const contract = this.contracts.get(contractName);
      if (!contract) {
        throw new Error(`Contract ${contractName} not found`);
      }

      // Setup signer if needed
      if (!contract.runner || !contract.runner.sendTransaction) {
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('Private key not configured for transaction signing');
        }
        
        const wallet = new ethers.Wallet(privateKey, this.provider);
        const contractWithSigner = contract.connect(wallet);
        
        const tx = await contractWithSigner[methodName](...args, options);
        
        logger.info('Transaction submitted', {
          contract: contractName,
          method: methodName,
          hash: tx.hash,
          gasLimit: tx.gasLimit?.toString(),
          gasPrice: tx.gasPrice?.toString()
        });

        return tx;
      }

    } catch (error) {
      logger.error('Failed to submit transaction:', error, {
        contract: contractName,
        method: methodName
      });
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
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Remove all listeners
    for (const [contractName, contract] of this.contracts) {
      contract.removeAllListeners();
    }

    if (this.provider) {
      this.provider.removeAllListeners();
    }

    logger.info('Blockchain event monitoring stopped');
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      contractsLoaded: this.contracts.size,
      lastProcessedBlock: this.lastProcessedBlock,
      network: this.config.network,
      provider: this.provider ? 'connected' : 'disconnected'
    };
  }
}

export default BlockchainEventMonitor;