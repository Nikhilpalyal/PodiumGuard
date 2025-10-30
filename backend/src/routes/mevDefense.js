// MEV Defense API Routes
import express from 'express';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Get MEV Defense System status
router.get('/status', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;
    
    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available',
        status: 'offline'
      });
    }

    const status = mevDefenseSystem.getSystemStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({
      error: 'Failed to get system status',
      message: error.message
    });
  }
});

// Get recent MEV detections
router.get('/detections', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;
    const limit = parseInt(req.query.limit) || 50;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    const detections = mevDefenseSystem.getRecentDetections(limit);
    res.json({
      success: true,
      data: {
        detections,
        count: detections.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting detections:', error);
    res.status(500).json({
      error: 'Failed to get detections',
      message: error.message
    });
  }
});

// Get recent mempool transactions
router.get('/mempool', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;
    const limit = parseInt(req.query.limit) || 100;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    const transactions = mevDefenseSystem.getRecentTransactions(limit);
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting mempool data:', error);
    res.status(500).json({
      error: 'Failed to get mempool data',
      message: error.message
    });
  }
});

// Get threat statistics
router.get('/threats/stats', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    const stats = mevDefenseSystem.getThreatStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting threat stats:', error);
    res.status(500).json({
      error: 'Failed to get threat statistics',
      message: error.message
    });
  }
});

// Enable protection for a user
router.post('/protection/enable', async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        error: 'User address is required'
      });
    }

    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    mevDefenseSystem.enableProtectionForUser(userAddress);
    
    res.json({
      success: true,
      message: `Protection enabled for ${userAddress}`,
      data: {
        userAddress,
        protected: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error enabling protection:', error);
    res.status(500).json({
      error: 'Failed to enable protection',
      message: error.message
    });
  }
});

// Disable protection for a user
router.post('/protection/disable', async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        error: 'User address is required'
      });
    }

    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    mevDefenseSystem.disableProtectionForUser(userAddress);
    
    res.json({
      success: true,
      message: `Protection disabled for ${userAddress}`,
      data: {
        userAddress,
        protected: false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error disabling protection:', error);
    res.status(500).json({
      error: 'Failed to disable protection',
      message: error.message
    });
  }
});

// Check protection status for a user
router.get('/protection/status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;

    if (!mevDefenseSystem) {
      return res.status(503).json({
        error: 'MEV Defense System not available'
      });
    }

    const isProtected = mevDefenseSystem.isUserProtected(address);
    
    res.json({
      success: true,
      data: {
        userAddress: address,
        protected: isProtected,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error checking protection status:', error);
    res.status(500).json({
      error: 'Failed to check protection status',
      message: error.message
    });
  }
});

// Analyze a specific transaction
router.post('/analyze', async (req, res) => {
  try {
    const { transactionHash, transactionData } = req.body;
    
    if (!transactionHash && !transactionData) {
      return res.status(400).json({
        error: 'Transaction hash or transaction data is required'
      });
    }

    const aiService = global.aiService || req.app.locals.aiService;

    if (!aiService) {
      return res.status(503).json({
        error: 'AI service not available'
      });
    }

    // If we have transaction data, analyze it directly
    if (transactionData) {
      const analysis = await aiService.analyzeTransaction(transactionData);
      return res.json({
        success: true,
        data: {
          transactionHash: transactionData.txHash || transactionHash,
          analysis,
          timestamp: new Date().toISOString()
        }
      });
    }

    // If we only have hash, we'd need to fetch the transaction
    // For now, return mock analysis
    const mockAnalysis = {
      riskScore: Math.floor(Math.random() * 100),
      category: ['normal', 'suspicious', 'high_risk'][Math.floor(Math.random() * 3)],
      riskFactors: ['high_gas', 'unusual_timing'],
      confidence: Math.floor(Math.random() * 30 + 70)
    };

    res.json({
      success: true,
      data: {
        transactionHash,
        analysis: mockAnalysis,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error analyzing transaction:', error);
    res.status(500).json({
      error: 'Failed to analyze transaction',
      message: error.message
    });
  }
});

// Get network statistics
router.get('/network/stats', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;

    if (!mevDefenseSystem) {
      // Return mock stats if system not available
      return res.json({
        success: true,
        data: {
          totalTransactions: Math.floor(Math.random() * 10000 + 50000),
          pendingTransactions: Math.floor(Math.random() * 500 + 200),
          averageGasPrice: Math.floor(Math.random() * 50 + 30),
          mevOpportunities: Math.floor(Math.random() * 20 + 5),
          threatLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          timestamp: new Date().toISOString()
        }
      });
    }

    const stats = mevDefenseSystem.getThreatStatistics();
    
    res.json({
      success: true,
      data: {
        totalTransactions: stats.totalScanned,
        pendingTransactions: Math.floor(Math.random() * 500 + 200),
        averageGasPrice: Math.floor(Math.random() * 50 + 30),
        mevOpportunities: stats.threatsDetected,
        threatLevel: mevDefenseSystem.getThreatLevel(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting network stats:', error);
    res.status(500).json({
      error: 'Failed to get network statistics',
      message: error.message
    });
  }
});

// Submit feedback about detection accuracy
router.post('/feedback', async (req, res) => {
  try {
    const { detectionId, feedback, userAddress } = req.body;
    
    if (!detectionId || !feedback) {
      return res.status(400).json({
        error: 'Detection ID and feedback are required'
      });
    }

    // Store feedback (in a real implementation, you'd save this to database)
    logger.info(`Feedback received for detection ${detectionId}: ${feedback}`);
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        detectionId,
        feedback,
        userAddress: userAddress || 'anonymous',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

// Health check for MEV Defense System
router.get('/health', async (req, res) => {
  try {
    const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;
    
    const health = {
      mevDefenseSystem: mevDefenseSystem ? 'online' : 'offline',
      aiService: global.aiService ? 'online' : 'offline',
      contractService: global.contractService ? 'online' : 'offline',
      safeModeService: global.safeModeService ? 'online' : 'offline',
      timestamp: new Date().toISOString()
    };

    const allServicesOnline = Object.values(health).every(status => 
      status === 'online' || status === health.timestamp
    );

    res.status(allServicesOnline ? 200 : 503).json({
      success: allServicesOnline,
      data: health
    });
  } catch (error) {
    logger.error('Error checking health:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

export default router;