import express from 'express';
import winston from 'winston';

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

const router = express.Router();

// Store service references (will be set by main server)
let telemetryCollector;
let speedEngine;
let analyticsEngine;
let raceStateTracker;
let dataAggregator;
let cacheService;
let timeSeriesDB;
let metadataStore;

// Initialize services function
export function setRaceTelemetryServices(services) {
  telemetryCollector = services.telemetryCollector;
  speedEngine = services.speedEngine;
  analyticsEngine = services.analyticsEngine;
  raceStateTracker = services.raceStateTracker;
  dataAggregator = services.dataAggregator;
  cacheService = services.cacheService;
  timeSeriesDB = services.timeSeriesDB;
  metadataStore = services.metadataStore;
}

// Get current race state
router.get('/state', async (req, res) => {
  try {
    const state = raceStateTracker ? raceStateTracker.getCurrentState() : null;

    if (!state) {
      return res.status(503).json({
        success: false,
        error: 'Race state not available'
      });
    }

    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    logger.error('Error getting race state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Try cache first
    let leaderboard = cacheService ? cacheService.getLeaderboard() : null;

    if (!leaderboard) {
      leaderboard = raceStateTracker ? raceStateTracker.getLeaderboard() : [];

      // Cache for 5 seconds
      if (cacheService) {
        cacheService.setLeaderboard(leaderboard);
      }
    }

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get car telemetry data
router.get('/cars/:carId', async (req, res) => {
  try {
    const { carId } = req.params;
    const { timeRange = 3600000 } = req.query; // 1 hour default

    // Try cache first
    let carData = cacheService ? cacheService.getTelemetryData(carId) : null;

    if (!carData) {
      // Get from time-series database
      const speedHistory = timeSeriesDB ? timeSeriesDB.getCarSpeedHistory(carId, parseInt(timeRange)) : [];
      const positionHistory = timeSeriesDB ? timeSeriesDB.getCarPositionHistory(carId, parseInt(timeRange)) : [];

      carData = {
        carId: parseInt(carId),
        speedHistory,
        positionHistory,
        currentState: raceStateTracker ? raceStateTracker.getCarState(parseInt(carId)) : null,
        metadata: metadataStore ? metadataStore.getDriverInfo(parseInt(carId)) : null
      };

      // Cache for 10 seconds
      if (cacheService) {
        cacheService.setTelemetryData(carId, carData);
      }
    }

    res.json({
      success: true,
      data: carData
    });
  } catch (error) {
    logger.error('Error getting car data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { type, timeRange = 3600000 } = req.query;

    let analyticsData;

    if (type === 'events') {
      analyticsData = analyticsEngine ? analyticsEngine.getStatusSummary() : null;
    } else if (type === 'performance') {
      analyticsData = speedEngine ? speedEngine.getPerformanceSummary() : null;
    } else {
      // General analytics
      analyticsData = {
        eventSummary: analyticsEngine ? analyticsEngine.getStatusSummary() : null,
        performanceSummary: speedEngine ? speedEngine.getPerformanceSummary() : null,
        systemStats: dataAggregator ? dataAggregator.getAggregatorStats() : null
      };
    }

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get race statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = raceStateTracker ? raceStateTracker.getRaceStats() : null;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting race stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get metadata
router.get('/metadata', async (req, res) => {
  try {
    const { category, key } = req.query;

    let metadata;

    if (category && key) {
      metadata = metadataStore ? metadataStore.get(category, key) : null;
    } else if (category) {
      metadata = metadataStore ? metadataStore.getCategory(category) : {};
    } else {
      metadata = metadataStore ? metadataStore.getAll() : {};
    }

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    logger.error('Error getting metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get time-series data
router.get('/timeseries', async (req, res) => {
  try {
    const { measurement, tags, timeRange = 3600000, limit = 1000 } = req.query;

    if (!measurement) {
      return res.status(400).json({
        success: false,
        error: 'Measurement parameter is required'
      });
    }

    const data = timeSeriesDB ?
      timeSeriesDB.query(measurement, tags ? JSON.parse(tags) : {}, parseInt(timeRange), parseInt(limit)) :
      [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error getting time-series data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get aggregated data
router.get('/aggregate', async (req, res) => {
  try {
    const { measurement, tags, timeRange = 3600000, aggregation = 'avg' } = req.query;

    if (!measurement) {
      return res.status(400).json({
        success: false,
        error: 'Measurement parameter is required'
      });
    }

    const data = timeSeriesDB ?
      timeSeriesDB.aggregate(measurement, tags ? JSON.parse(tags) : {}, parseInt(timeRange), aggregation) :
      null;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error getting aggregated data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get live data snapshot
router.get('/live', async (req, res) => {
  try {
    const snapshot = dataAggregator ? dataAggregator.getLatestSnapshot() : null;

    if (!snapshot) {
      return res.status(503).json({
        success: false,
        error: 'Live data not available'
      });
    }

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Error getting live data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get system health
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      services: {
        telemetryCollector: !!telemetryCollector,
        speedEngine: !!speedEngine,
        analyticsEngine: !!analyticsEngine,
        raceStateTracker: !!raceStateTracker,
        dataAggregator: !!dataAggregator,
        cacheService: !!cacheService,
        timeSeriesDB: !!timeSeriesDB,
        metadataStore: !!metadataStore
      },
      stats: {
        cache: cacheService ? cacheService.getStats() : null,
        timeSeries: timeSeriesDB ? timeSeriesDB.getStats() : null,
        metadata: metadataStore ? metadataStore.getStats() : null,
        aggregator: dataAggregator ? dataAggregator.getAggregatorStats() : null
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search metadata
router.get('/search', async (req, res) => {
  try {
    const { q, category } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query parameter is required'
      });
    }

    const results = metadataStore ? metadataStore.search(q, category) : [];

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error searching metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST endpoints for data submission (if needed for testing)
router.post('/test-data', async (req, res) => {
  try {
    const { type, data } = req.body;

    // This would be used for testing or manual data injection
    logger.info(`Test data received: ${type}`);

    res.json({
      success: true,
      message: 'Test data received'
    });
  } catch (error) {
    logger.error('Error processing test data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;