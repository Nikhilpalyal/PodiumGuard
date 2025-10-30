import express from 'express';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// GET /api/detections - Returns AI-flagged transactions with risk scores
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      minRiskScore = 0, 
      category, 
      sortBy = 'timestamp',
      sortOrder = 'desc',
      timeRange 
    } = req.query;

    // Import Detection model dynamically to avoid circular dependencies
    const { default: Detection } = await import('../models/Detection.js');
    
    // Build query
    const query = {};
    
    if (minRiskScore > 0) {
      query.riskScore = { $gte: parseFloat(minRiskScore) };
    }
    
    if (category) {
      query.category = category;
    }
    
    if (timeRange) {
      const now = new Date();
      const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
      query.timestamp = { $gte: startTime };
    }
    
    // Execute query with pagination and sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const detections = await Detection
      .find(query)
      .sort(sortOptions)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const totalCount = await Detection.countDocuments(query);
    
    res.json({
      detections,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        minRiskScore: parseFloat(minRiskScore),
        category: category || null,
        timeRange: timeRange ? parseInt(timeRange) : null
      },
      sorting: {
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching detections:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch detections'
    });
  }
});

// GET /api/detections/:id - Get specific detection details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid detection ID',
        message: 'Detection ID must be a valid MongoDB ObjectId'
      });
    }

    const { default: Detection } = await import('../models/Detection.js');
    
    const detection = await Detection.findById(id).lean();
    
    if (!detection) {
      return res.status(404).json({
        error: 'Detection not found',
        message: 'Detection with the specified ID was not found'
      });
    }

    // Get contract details if available
    const contractService = global.contractService || req.app.locals.contractService;
    let contractData = null;
    
    if (contractService && detection.contractDetectionId) {
      contractData = await contractService.getDetection(detection.contractDetectionId);
    }

    res.json({
      detection,
      contractData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching detection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch detection details'
    });
  }
});

// PUT /api/detections/:id/mitigate - Mark detection as mitigated
router.put('/:id/mitigate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, mitigatedBy } = req.body;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid detection ID',
        message: 'Detection ID must be a valid MongoDB ObjectId'
      });
    }

    const { default: Detection } = await import('../models/Detection.js');
    
    const detection = await Detection.findById(id);
    
    if (!detection) {
      return res.status(404).json({
        error: 'Detection not found',
        message: 'Detection with the specified ID was not found'
      });
    }

    if (detection.mitigated) {
      return res.status(400).json({
        error: 'Detection already mitigated',
        message: 'This detection has already been marked as mitigated'
      });
    }

    // Update detection in database
    detection.mitigated = true;
    detection.mitigatedAt = new Date();
    detection.mitigatedBy = mitigatedBy || 'Unknown';
    detection.mitigationReason = reason || 'No reason provided';
    
    await detection.save();

    // Update contract if available
    const contractService = global.contractService || req.app.locals.contractService;
    let contractResult = null;
    
    if (contractService && detection.contractDetectionId) {
      contractResult = await contractService.mitigateDetection(detection.contractDetectionId);
    }

    logger.info(`Detection ${id} mitigated by ${mitigatedBy}`);

    res.json({
      message: 'Detection mitigated successfully',
      detection: detection.toObject(),
      contractResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error mitigating detection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mitigate detection'
    });
  }
});

// GET /api/detections/stats/summary - Get detection statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { timeRange = 86400 } = req.query; // Default 24 hours
    
    const { default: Detection } = await import('../models/Detection.js');
    
    const now = new Date();
    const startTime = new Date(now.getTime() - parseInt(timeRange) * 1000);
    
    // Aggregate statistics
    const stats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: null,
          totalDetections: { $sum: 1 },
          highRiskDetections: {
            $sum: { $cond: [{ $gte: ['$riskScore', 75] }, 1, 0] }
          },
          mediumRiskDetections: {
            $sum: { $cond: [{ $and: [{ $gte: ['$riskScore', 25] }, { $lt: ['$riskScore', 75] }] }, 1, 0] }
          },
          lowRiskDetections: {
            $sum: { $cond: [{ $lt: ['$riskScore', 25] }, 1, 0] }
          },
          mitigatedDetections: {
            $sum: { $cond: ['$mitigated', 1, 0] }
          },
          avgRiskScore: { $avg: '$riskScore' },
          maxRiskScore: { $max: '$riskScore' },
          totalValue: { $sum: { $toDouble: '$value' } }
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' }
        }
      }
    ]);

    // Get hourly breakdown for the last 24 hours
    const hourlyStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 },
          highRiskCount: {
            $sum: { $cond: [{ $gte: ['$riskScore', 75] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.hour': 1 }
      }
    ]);

    const result = stats[0] || {
      totalDetections: 0,
      highRiskDetections: 0,
      mediumRiskDetections: 0,
      lowRiskDetections: 0,
      mitigatedDetections: 0,
      avgRiskScore: 0,
      maxRiskScore: 0,
      totalValue: 0
    };

    res.json({
      summary: result,
      categoryBreakdown: categoryStats,
      hourlyBreakdown: hourlyStats,
      timeRange: parseInt(timeRange),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching detection stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch detection statistics'
    });
  }
});

// GET /api/detections/alerts/recent - Get recent high-risk alerts
router.get('/alerts/recent', async (req, res) => {
  try {
    const { limit = 50, minRiskScore = 75 } = req.query;
    
    const { default: Detection } = await import('../models/Detection.js');
    
    const alerts = await Detection
      .find({ 
        riskScore: { $gte: parseFloat(minRiskScore) }
      })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      alerts,
      criteria: {
        minRiskScore: parseFloat(minRiskScore),
        limit: parseInt(limit)
      },
      count: alerts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching recent alerts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch recent alerts'
    });
  }
});

// POST /api/detections/search - Advanced detection search
router.post('/search', async (req, res) => {
  try {
    const {
      txHash,
      fromAddress,
      toAddress,
      minRiskScore,
      maxRiskScore,
      categories,
      riskFactors,
      mitigated,
      dateRange,
      limit = 100,
      offset = 0
    } = req.body;

    const { default: Detection } = await import('../models/Detection.js');
    
    const query = {};
    
    if (txHash) {
      query.txHash = { $regex: txHash, $options: 'i' };
    }
    
    if (fromAddress) {
      query.from = { $regex: fromAddress, $options: 'i' };
    }
    
    if (toAddress) {
      query.to = { $regex: toAddress, $options: 'i' };
    }
    
    if (minRiskScore !== undefined && maxRiskScore !== undefined) {
      query.riskScore = { $gte: minRiskScore, $lte: maxRiskScore };
    } else if (minRiskScore !== undefined) {
      query.riskScore = { $gte: minRiskScore };
    } else if (maxRiskScore !== undefined) {
      query.riskScore = { $lte: maxRiskScore };
    }
    
    if (categories && Array.isArray(categories)) {
      query.category = { $in: categories };
    }
    
    if (riskFactors && Array.isArray(riskFactors)) {
      query.riskFactors = { $in: riskFactors };
    }
    
    if (mitigated !== undefined) {
      query.mitigated = mitigated;
    }
    
    if (dateRange && dateRange.start && dateRange.end) {
      query.timestamp = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }
    
    const detections = await Detection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    const totalCount = await Detection.countDocuments(query);
    
    res.json({
      detections,
      searchCriteria: req.body,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error searching detections:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search detections'
    });
  }
});

export default router;