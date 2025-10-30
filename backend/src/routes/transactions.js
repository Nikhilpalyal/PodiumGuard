import express from 'express';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// GET /api/transactions - Returns list of recent scanned transactions
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, riskScore, category } = req.query;
    
    // Get mempool listener instance from global scope or service registry
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    
    if (!mempoolListener) {
      return res.status(503).json({
        error: 'Mempool listener not available',
        message: 'Service is starting up'
      });
    }

    // Get recent transactions from mempool listener
    let transactions = mempoolListener.getRecentTransactions(parseInt(limit) + parseInt(offset));
    
    // Apply filters if provided
    if (riskScore) {
      const minRisk = parseFloat(riskScore);
      transactions = transactions.filter(tx => tx.riskScore >= minRisk);
    }
    
    if (category) {
      transactions = transactions.filter(tx => tx.category === category);
    }
    
    // Apply pagination
    const paginatedTransactions = transactions.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      transactions: paginatedTransactions,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: transactions.length,
        hasMore: transactions.length > parseInt(offset) + parseInt(limit)
      },
      filters: {
        riskScore: riskScore || null,
        category: category || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transactions'
    });
  }
});

// GET /api/transactions/:hash - Get specific transaction details
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || hash.length !== 66 || !hash.startsWith('0x')) {
      return res.status(400).json({
        error: 'Invalid transaction hash',
        message: 'Transaction hash must be a valid 66-character hex string starting with 0x'
      });
    }

    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    
    if (!mempoolListener) {
      return res.status(503).json({
        error: 'Mempool listener not available',
        message: 'Service is starting up'
      });
    }

    // Find transaction in recent transactions
    const transactions = mempoolListener.getRecentTransactions(10000); // Get more for search
    const transaction = transactions.find(tx => tx.txHash.toLowerCase() === hash.toLowerCase());
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction not found in recent transactions'
      });
    }

    res.json({
      transaction,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transaction details'
    });
  }
});

// GET /api/transactions/status - Get mempool listener status
router.get('/status', async (req, res) => {
  try {
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    
    if (!mempoolListener) {
      return res.status(503).json({
        error: 'Mempool listener not available',
        status: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }

    const status = mempoolListener.getStatus();
    
    res.json({
      status: status.isListening ? 'active' : 'inactive',
      details: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting mempool status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get mempool status'
    });
  }
});

// POST /api/transactions/search - Advanced transaction search
router.post('/search', async (req, res) => {
  try {
    const { 
      fromAddress, 
      toAddress, 
      minValue, 
      maxValue, 
      minRiskScore, 
      maxRiskScore,
      categories,
      timeRange,
      limit = 100 
    } = req.body;

    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    
    if (!mempoolListener) {
      return res.status(503).json({
        error: 'Mempool listener not available',
        message: 'Service is starting up'
      });
    }

    let transactions = mempoolListener.getRecentTransactions(10000);
    
    // Apply filters
    if (fromAddress) {
      transactions = transactions.filter(tx => 
        tx.from.toLowerCase() === fromAddress.toLowerCase()
      );
    }
    
    if (toAddress) {
      transactions = transactions.filter(tx => 
        tx.to?.toLowerCase() === toAddress.toLowerCase()
      );
    }
    
    if (minValue !== undefined) {
      transactions = transactions.filter(tx => 
        parseFloat(tx.value) >= parseFloat(minValue)
      );
    }
    
    if (maxValue !== undefined) {
      transactions = transactions.filter(tx => 
        parseFloat(tx.value) <= parseFloat(maxValue)
      );
    }
    
    if (minRiskScore !== undefined) {
      transactions = transactions.filter(tx => 
        (tx.riskScore || 0) >= parseFloat(minRiskScore)
      );
    }
    
    if (maxRiskScore !== undefined) {
      transactions = transactions.filter(tx => 
        (tx.riskScore || 0) <= parseFloat(maxRiskScore)
      );
    }
    
    if (categories && Array.isArray(categories)) {
      transactions = transactions.filter(tx => 
        categories.includes(tx.category)
      );
    }
    
    if (timeRange) {
      const now = new Date();
      const startTime = new Date(now.getTime() - timeRange * 1000); // timeRange in seconds
      transactions = transactions.filter(tx => 
        new Date(tx.timestamp) >= startTime
      );
    }
    
    // Limit results
    transactions = transactions.slice(0, parseInt(limit));
    
    res.json({
      transactions,
      searchCriteria: req.body,
      resultCount: transactions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error searching transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search transactions'
    });
  }
});

export default router;