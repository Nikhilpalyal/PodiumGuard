import winston from 'winston';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BlockchainLogger {
  constructor(contractService = null) {
    this.contractService = contractService;
    this.logQueue = [];
    this.processedLogs = new Map();
    this.isActive = false;
    this.batchSize = 10;
    this.batchInterval = 30000; // 30 seconds
    this.listeners = [];

    // In-memory blockchain for demo purposes
    this.blockchain = [];
    this.pendingTransactions = [];
    this.miningDifficulty = 2;
  }

  // Subscribe to blockchain events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of blockchain events
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error notifying blockchain listener:', error);
      }
    });
  }

  // Start blockchain logging
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Start batch processing
    this.startBatchProcessing();

    logger.info('Blockchain Logger started');
  }

  // Stop blockchain logging
  stop() {
    this.isActive = false;
    logger.info('Blockchain Logger stopped');
  }

  // Log race event to blockchain
  async logRaceEvent(eventType, eventData, metadata = {}) {
    try {
      const logEntry = {
        id: this.generateEventId(),
        type: eventType,
        data: eventData,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          blockHeight: this.blockchain.length
        },
        hash: '',
        signature: ''
      };

      // Create hash of the event
      logEntry.hash = this.hashEvent(logEntry);

      // Add to queue for batch processing
      this.logQueue.push(logEntry);

      logger.debug(`Race event logged: ${eventType} - ${logEntry.id}`);

      return logEntry.id;

    } catch (error) {
      logger.error('Error logging race event:', error);
      return null;
    }
  }

  // Log telemetry data point
  async logTelemetryData(carId, dataPoint, timestamp = new Date()) {
    return this.logRaceEvent('TELEMETRY_DATA', {
      carId,
      dataPoint,
      timestamp: timestamp.toISOString()
    }, {
      dataType: 'telemetry',
      carId
    });
  }

  // Log race incident
  async logRaceIncident(incidentType, carId, description, severity = 'MEDIUM') {
    return this.logRaceEvent('RACE_INCIDENT', {
      incidentType,
      carId,
      description,
      severity
    }, {
      dataType: 'incident',
      severity
    });
  }

  // Log lap completion
  async logLapCompletion(carId, lapNumber, lapTime, sectorTimes = []) {
    return this.logRaceEvent('LAP_COMPLETION', {
      carId,
      lapNumber,
      lapTime,
      sectorTimes
    }, {
      dataType: 'lap',
      lapNumber
    });
  }

  // Log pit stop
  async logPitStop(carId, pitLaneTime, tireChange = false, fuelAdded = 0) {
    return this.logRaceEvent('PIT_STOP', {
      carId,
      pitLaneTime,
      tireChange,
      fuelAdded
    }, {
      dataType: 'pit_stop'
    });
  }

  // Log race result
  async logRaceResult(finalPositions, raceDuration, totalLaps) {
    return this.logRaceEvent('RACE_RESULT', {
      finalPositions,
      raceDuration,
      totalLaps
    }, {
      dataType: 'result',
      final: true
    });
  }

  // Generate unique event ID
  generateEventId() {
    return crypto.randomUUID();
  }

  // Hash event data
  hashEvent(event) {
    const eventString = JSON.stringify({
      id: event.id,
      type: event.type,
      data: event.data,
      metadata: event.metadata
    });

    return crypto.createHash('sha256').update(eventString).digest('hex');
  }

  // Start batch processing of logs
  startBatchProcessing() {
    setInterval(() => {
      if (this.isActive && this.logQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchInterval);
  }

  // Process a batch of logs
  async processBatch() {
    try {
      const batch = this.logQueue.splice(0, this.batchSize);

      if (batch.length === 0) return;

      // Create a block with the batch
      const block = await this.createBlock(batch);

      // Add block to blockchain
      this.blockchain.push(block);

      // Notify listeners
      this.notify({
        type: 'BLOCK_MINED',
        block,
        transactionCount: batch.length,
        timestamp: new Date().toISOString()
      });

      logger.info(`Block mined with ${batch.length} transactions - Block #${block.height}`);

    } catch (error) {
      logger.error('Error processing batch:', error);
    }
  }

  // Create a new block
  async createBlock(transactions) {
    const previousBlock = this.blockchain.length > 0 ?
      this.blockchain[this.blockchain.length - 1] : null;

    const block = {
      height: this.blockchain.length,
      timestamp: new Date().toISOString(),
      transactions: transactions,
      previousHash: previousBlock ? previousBlock.hash : '0'.repeat(64),
      hash: '',
      nonce: 0,
      merkleRoot: this.calculateMerkleRoot(transactions)
    };

    // Mine the block (simplified proof-of-work)
    block.hash = await this.mineBlock(block);

    return block;
  }

  // Simplified mining (just for demo)
  async mineBlock(block) {
    let nonce = 0;
    let hash = '';

    const target = '0'.repeat(this.miningDifficulty);

    while (true) {
      const blockString = JSON.stringify({
        height: block.height,
        timestamp: block.timestamp,
        transactions: block.transactions,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        nonce
      });

      hash = crypto.createHash('sha256').update(blockString).digest('hex');

      if (hash.startsWith(target)) {
        block.nonce = nonce;
        return hash;
      }

      nonce++;
    }
  }

  // Calculate Merkle root (simplified)
  calculateMerkleRoot(transactions) {
    if (transactions.length === 0) return '0'.repeat(64);

    const hashes = transactions.map(tx => tx.hash);

    while (hashes.length > 1) {
      const newHashes = [];

      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left; // Duplicate last hash if odd number

        const combined = left + right;
        const newHash = crypto.createHash('sha256').update(combined).digest('hex');
        newHashes.push(newHash);
      }

      hashes.length = 0;
      hashes.push(...newHashes);
    }

    return hashes[0];
  }

  // Verify blockchain integrity
  verifyBlockchain() {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const previousBlock = this.blockchain[i - 1];

      // Check hash
      const recalculatedHash = this.hashBlock(currentBlock);
      if (recalculatedHash !== currentBlock.hash) {
        return { valid: false, error: `Block ${i} hash mismatch` };
      }

      // Check previous hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return { valid: false, error: `Block ${i} previous hash mismatch` };
      }
    }

    return { valid: true };
  }

  // Hash a block
  hashBlock(block) {
    const blockString = JSON.stringify({
      height: block.height,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      nonce: block.nonce
    });

    return crypto.createHash('sha256').update(blockString).digest('hex');
  }

  // Get blockchain statistics
  getBlockchainStats() {
    return {
      blockCount: this.blockchain.length,
      totalTransactions: this.blockchain.reduce((sum, block) => sum + block.transactions.length, 0),
      pendingTransactions: this.logQueue.length,
      latestBlock: this.blockchain.length > 0 ? this.blockchain[this.blockchain.length - 1] : null,
      verificationStatus: this.verifyBlockchain(),
      averageBlockTime: this.calculateAverageBlockTime()
    };
  }

  // Calculate average block time
  calculateAverageBlockTime() {
    if (this.blockchain.length < 2) return 0;

    const times = [];
    for (let i = 1; i < this.blockchain.length; i++) {
      const prevTime = new Date(this.blockchain[i - 1].timestamp).getTime();
      const currTime = new Date(this.blockchain[i].timestamp).getTime();
      times.push(currTime - prevTime);
    }

    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  // Get block by height
  getBlock(height) {
    return this.blockchain[height] || null;
  }

  // Get transaction by ID
  getTransaction(txId) {
    for (const block of this.blockchain) {
      const tx = block.transactions.find(t => t.id === txId);
      if (tx) {
        return {
          transaction: tx,
          blockHeight: block.height,
          blockHash: block.hash,
          confirmed: true
        };
      }
    }

    // Check pending transactions
    const pendingTx = this.logQueue.find(t => t.id === txId);
    if (pendingTx) {
      return {
        transaction: pendingTx,
        blockHeight: null,
        blockHash: null,
        confirmed: false
      };
    }

    return null;
  }

  // Get transactions by type
  getTransactionsByType(type, limit = 100) {
    const transactions = [];

    for (const block of this.blockchain.slice().reverse()) {
      for (const tx of block.transactions.slice().reverse()) {
        if (tx.type === type) {
          transactions.push({
            ...tx,
            blockHeight: block.height,
            blockHash: block.hash
          });

          if (transactions.length >= limit) break;
        }
      }
      if (transactions.length >= limit) break;
    }

    return transactions;
  }

  // Get transactions by car
  getTransactionsByCar(carId, limit = 50) {
    const transactions = [];

    for (const block of this.blockchain.slice().reverse()) {
      for (const tx of block.transactions.slice().reverse()) {
        if (tx.data && tx.data.carId === carId) {
          transactions.push({
            ...tx,
            blockHeight: block.height,
            blockHash: block.hash
          });

          if (transactions.length >= limit) break;
        }
      }
      if (transactions.length >= limit) break;
    }

    return transactions;
  }

  // Export blockchain data
  exportBlockchain() {
    return {
      blockchain: this.blockchain,
      pendingTransactions: this.logQueue,
      stats: this.getBlockchainStats(),
      exportTime: new Date().toISOString()
    };
  }

  // Clear blockchain (for testing)
  clear() {
    this.blockchain = [];
    this.logQueue = [];
    this.processedLogs.clear();
    logger.info('Blockchain cleared');
  }
}

export default BlockchainLogger;