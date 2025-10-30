import express from 'express';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// GET /api/stats - Returns summary statistics
router.get('/', async (req, res) => {
  try {
    const { timeRange = 86400 } = req.query; // Default 24 hours in seconds
    
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
    
    // Get database statistics
    const { default: Detection } = await import('../models/Detection.js');
    
    const dbStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: null,
          totalDetections: { $sum: 1 },
          attacksDetected: {
            $sum: { $cond: [{ $gte: ['$riskScore', 75] }, 1, 0] }
          },
          avgRiskScore: { $avg: '$riskScore' },
          totalValue: { $sum: { $toDouble: '$value' } },
          avgGasPrice: { $avg: { $toDouble: '$gasPrice' } }
        }
      }
    ]);

    // Get mempool listener stats
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    const mempoolStats = mempoolListener ? mempoolListener.getStatus() : null;

    // Get contract stats
    const contractService = global.contractService || req.app.locals.contractService;
    const contractStats = contractService ? await contractService.getSystemStats() : null;

    // Get AI service stats
    const aiService = global.aiService || req.app.locals.aiService;
    let aiStats = null;
    if (aiService) {
      try {
        aiStats = await aiService.getStats();
      } catch (error) {
        logger.warn('AI service stats unavailable:', error.message);
      }
    }

    // Calculate system mode
    let systemMode = 'Normal';
    if (contractService) {
      systemMode = await contractService.getCurrentMode();
    }

    // Prepare response
    const stats = dbStats[0] || {
      totalDetections: 0,
      attacksDetected: 0,
      avgRiskScore: 0,
      totalValue: 0,
      avgGasPrice: 0
    };

    res.json({
      summary: {
        attacksDetected: stats.attacksDetected,
        totalTransactionsScanned: mempoolStats?.processedCount || 0,
        averageGasFee: Math.round(stats.avgGasPrice || 0),
        systemMode: systemMode,
        detectionRate: stats.totalDetections > 0 ? 
          ((stats.attacksDetected / stats.totalDetections) * 100).toFixed(2) : 0,
        totalValueAtRisk: stats.totalValue.toFixed(4),
        avgRiskScore: Math.round(stats.avgRiskScore || 0)
      },
      services: {
        mempoolListener: {
          status: mempoolStats?.isListening ? 'active' : 'inactive',
          processedTransactions: mempoolStats?.processedCount || 0,
          recentTransactions: mempoolStats?.recentTransactionsCount || 0,
          network: mempoolStats?.network || 'unknown'
        },
        aiEngine: {
          status: aiStats ? 'active' : 'inactive',
          totalAnalyzed: aiStats?.total_analyzed || 0,
          highRiskCount: aiStats?.high_risk_count || 0,
          avgRiskScore: aiStats?.avg_risk_score || 0
        },
        smartContract: {
          status: contractStats ? 'active' : 'inactive',
          totalDetections: contractStats?.totalDetections || 0,
          highRiskDetections: contractStats?.highRiskDetections || 0,
          currentMode: contractStats?.currentMode || 'Unknown'
        }
      },
      timeRange: parseInt(timeRange),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch system statistics'
    });
  }
});

// GET /api/stats/performance - Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { timeRange = 3600 } = req.query; // Default 1 hour
    
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
    
    const { default: Detection } = await import('../models/Detection.js');
    
    // Get detection performance metrics
    const performanceStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M:00',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 },
          highRiskCount: {
            $sum: { $cond: [{ $gte: ['$riskScore', 75] }, 1, 0] }
          },
          avgRiskScore: { $avg: '$riskScore' },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get system health metrics
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    const contractService = global.contractService || req.app.locals.contractService;
    const aiService = global.aiService || req.app.locals.aiService;

    const healthMetrics = {
      mempoolListener: mempoolListener ? await mempoolListener.isHealthy?.() ?? true : false,
      contractService: contractService ? await contractService.isHealthy() : false,
      aiService: aiService ? await aiService.testConnection() : false
    };

    res.json({
      performance: performanceStats,
      health: healthMetrics,
      serviceStatus: {
        allServicesHealthy: Object.values(healthMetrics).every(status => status),
        healthyServices: Object.values(healthMetrics).filter(status => status).length,
        totalServices: Object.keys(healthMetrics).length
      },
      timeRange: parseInt(timeRange),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching performance stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch performance metrics'
    });
  }
});

// GET /api/stats/risk-distribution - Get risk score distribution
router.get('/risk-distribution', async (req, res) => {
  try {
    const { timeRange = 86400 } = req.query; // Default 24 hours
    
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
    
    const { default: Detection } = await import('../models/Detection.js');
    
    const distribution = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$riskScore' },
            categories: { $addToSet: '$category' }
          }
        }
      }
    ]);

    // Get category distribution
    const categoryDistribution = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' },
          totalValue: { $sum: { $toDouble: '$value' } }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      riskScoreDistribution: distribution,
      categoryDistribution: categoryDistribution,
      timeRange: parseInt(timeRange),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching risk distribution:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch risk distribution'
    });
  }
});

// GET /api/stats/network - Get network and gas statistics
router.get('/network', async (req, res) => {
  try {
    const { timeRange = 86400 } = req.query; // Default 24 hours
    
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
    
    const { default: Detection } = await import('../models/Detection.js');
    
    // Get gas price statistics
    const gasStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime },
          gasPrice: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgGasPrice: { $avg: { $toDouble: '$gasPrice' } },
          minGasPrice: { $min: { $toDouble: '$gasPrice' } },
          maxGasPrice: { $max: { $toDouble: '$gasPrice' } },
          medianGasPrice: { $avg: { $toDouble: '$gasPrice' } }, // Simplified median
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // Get mempool listener network info
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    const networkInfo = mempoolListener ? mempoolListener.getStatus() : null;

    // Get transaction value statistics
    const valueStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: null,
          avgValue: { $avg: { $toDouble: '$value' } },
          minValue: { $min: { $toDouble: '$value' } },
          maxValue: { $max: { $toDouble: '$value' } },
          totalValue: { $sum: { $toDouble: '$value' } }
        }
      }
    ]);

    res.json({
      network: {
        name: networkInfo?.network || 'unknown',
        isConnected: networkInfo?.isListening || false,
        processedTransactions: networkInfo?.processedCount || 0
      },
      gasPrice: gasStats[0] || {
        avgGasPrice: 0,
        minGasPrice: 0,
        maxGasPrice: 0,
        medianGasPrice: 0,
        totalTransactions: 0
      },
      transactionValue: valueStats[0] || {
        avgValue: 0,
        minValue: 0,
        maxValue: 0,
        totalValue: 0
      },
      timeRange: parseInt(timeRange),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching network stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch network statistics'
    });
  }
});

// GET /api/stats/realtime - Get real-time system metrics
router.get('/realtime', async (req, res) => {
  try {
    // Get last 5 minutes of data for real-time metrics
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
    
    const { default: Detection } = await import('../models/Detection.js');
    
    const realtimeStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            minute: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M:00',
                date: '$timestamp'
              }
            }
          },
          detections: { $sum: 1 },
          highRiskDetections: {
            $sum: { $cond: [{ $gte: ['$riskScore', 75] }, 1, 0] }
          },
          avgRiskScore: { $avg: '$riskScore' }
        }
      },
      {
        $sort: { '_id.minute': 1 }
      }
    ]);

    // Get current system status
    const mempoolListener = global.mempoolListener || req.app.locals.mempoolListener;
    const contractService = global.contractService || req.app.locals.contractService;
    
    const currentMode = contractService ? await contractService.getCurrentMode() : 'Unknown';
    const isListening = mempoolListener ? mempoolListener.getStatus().isListening : false;
    
    // Calculate detection rate (detections per minute)
    const recentDetections = realtimeStats.reduce((sum, stat) => sum + stat.detections, 0);
    const detectionRate = recentDetections / 5; // Average per minute over 5 minutes

    res.json({
      current: {
        systemMode: currentMode,
        isActive: isListening,
        detectionRate: Math.round(detectionRate * 100) / 100,
        lastUpdated: now.toISOString()
      },
      timeline: realtimeStats,
      alerts: {
        highDetectionRate: detectionRate > 1, // More than 1 detection per minute
        systemInSafeMode: currentMode === 'Safe',
        systemInEmergencyMode: currentMode === 'Emergency'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching realtime stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch real-time statistics'
    });
  }
});

export default router;