import winston from 'winston';

// Import all services
import RaceDataFeed from './raceDataFeed.js';
import TelemetryCollector from './telemetryCollector.js';
import DataNormalizer from './dataNormalizer.js';
import SpeedComputationEngine from './speedComputationEngine.js';
import AnalyticsEngine from './analyticsEngine.js';
import RaceStateTracker from './raceStateTracker.js';
import DataAggregator from './dataAggregator.js';
import CacheService from './cacheService.js';
import TimeSeriesDatabase from './timeSeriesDatabase.js';
import MetadataStore from './metadataStore.js';
import RaceWebSocketServer from './raceWebSocketServer.js';

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

class RaceTelemetrySystem {
  constructor(io) {
    this.io = io;
    this.isRunning = false;

    // Initialize all services
    this.services = {};
    this.initializeServices();

    logger.info('Race Telemetry System initialized');
  }

  // Initialize all services
  initializeServices() {
    try {
      // Data Source Layer
      this.services.dataFeed = new RaceDataFeed();
      this.services.telemetryCollector = new TelemetryCollector();
      this.services.dataNormalizer = new DataNormalizer();

      // Data Processing Layer
      this.services.speedEngine = new SpeedComputationEngine();
      this.services.analyticsEngine = new AnalyticsEngine();
      this.services.raceStateTracker = new RaceStateTracker();
      this.services.dataAggregator = new DataAggregator();

      // Data Storage Layer
      this.services.cacheService = new CacheService();
      this.services.timeSeriesDB = new TimeSeriesDatabase();
      this.services.metadataStore = new MetadataStore();

      // Data Communication Layer
      this.services.webSocketServer = new RaceWebSocketServer(this.io);

      // Warm up cache
      this.services.cacheService.warmRaceCache();

      logger.info('All race telemetry services initialized successfully');

    } catch (error) {
      logger.error('Error initializing race telemetry services:', error);
      throw error;
    }
  }

  // Start the telemetry system
  async start() {
    if (this.isRunning) return;

    try {
      logger.info('Starting Race Telemetry System...');

      // Start data collection
      await this.services.dataFeed.start();

      // Subscribe services to data flow
      this.setupDataFlow();

      this.isRunning = true;
      logger.info('Race Telemetry System started successfully');

    } catch (error) {
      logger.error('Error starting race telemetry system:', error);
      throw error;
    }
  }

  // Stop the telemetry system
  async stop() {
    if (!this.isRunning) return;

    try {
      logger.info('Stopping Race Telemetry System...');

      // Stop data collection
      this.services.dataFeed.stop();

      // Close WebSocket server
      this.services.webSocketServer.close();

      this.isRunning = false;
      logger.info('Race Telemetry System stopped');

    } catch (error) {
      logger.error('Error stopping race telemetry system:', error);
    }
  }

  // Setup data flow between services
  setupDataFlow() {
    // Data Feed -> Telemetry Collector
    this.services.dataFeed.subscribe((rawData) => {
      this.services.telemetryCollector.processRawData(rawData);
    });

    // Telemetry Collector -> Multiple consumers
    this.services.telemetryCollector.subscribe((telemetryData) => {
      // Normalize data
      const normalizedData = this.services.dataNormalizer.normalize(telemetryData);

      // Process speed data
      const speedData = this.services.speedEngine.processTelemetry(normalizedData);

      // Analyze for events
      const events = this.services.analyticsEngine.processTelemetry(normalizedData);

      // Update race state
      const stateUpdates = this.services.raceStateTracker.updateState(normalizedData);

      // Store in time-series database
      this.storeTimeSeriesData(normalizedData);

      // Aggregate all data
      const snapshot = this.services.dataAggregator.aggregateData(
        normalizedData,
        speedData,
        events,
        this.services.raceStateTracker.getCurrentState()
      );

      // Broadcast via WebSocket
      this.broadcastData(snapshot, events);
    });
  }

  // Store data in time-series database
  storeTimeSeriesData(telemetryData) {
    try {
      telemetryData.cars.forEach(car => {
        // Store speed data
        this.services.timeSeriesDB.insertSpeedData(car.carId, car.speed);

        // Store position data
        this.services.timeSeriesDB.insertPositionData(car.carId, car.position);

        // Store tire temperature data
        this.services.timeSeriesDB.insertTireTempData(car.carId, car.tireTemperatures);

        // Store engine data
        this.services.timeSeriesDB.insertEngineData(car.carId, car.engine);
      });
    } catch (error) {
      logger.error('Error storing time-series data:', error);
    }
  }

  // Broadcast data via WebSocket
  broadcastData(snapshot, events) {
    try {
      if (snapshot) {
        // Broadcast compact snapshot
        const compactSnapshot = this.services.dataAggregator.getCompactSnapshot();
        this.services.webSocketServer.broadcastTelemetrySnapshot(compactSnapshot);

        // Cache latest data
        this.services.cacheService.setRaceData('latest_snapshot', compactSnapshot);
      }

      if (events && events.length > 0) {
        // Broadcast alerts
        this.services.webSocketServer.broadcastAlerts(events);
      }

    } catch (error) {
      logger.error('Error broadcasting data:', error);
    }
  }

  // Get system status
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      services: {
        dataFeed: this.services.dataFeed ? 'active' : 'inactive',
        telemetryCollector: this.services.telemetryCollector ? 'active' : 'inactive',
        speedEngine: this.services.speedEngine ? 'active' : 'inactive',
        analyticsEngine: this.services.analyticsEngine ? 'active' : 'inactive',
        raceStateTracker: this.services.raceStateTracker ? 'active' : 'inactive',
        dataAggregator: this.services.dataAggregator ? 'active' : 'inactive',
        cacheService: this.services.cacheService ? 'active' : 'inactive',
        timeSeriesDB: this.services.timeSeriesDB ? 'active' : 'inactive',
        metadataStore: this.services.metadataStore ? 'active' : 'inactive',
        webSocketServer: this.services.webSocketServer ? 'active' : 'inactive'
      },
      stats: {
        cache: this.services.cacheService ? this.services.cacheService.getStats() : null,
        timeSeries: this.services.timeSeriesDB ? this.services.timeSeriesDB.getStats() : null,
        aggregator: this.services.dataAggregator ? this.services.dataAggregator.getAggregatorStats() : null
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get current race data
  getCurrentRaceData() {
    return {
      state: this.services.raceStateTracker ? this.services.raceStateTracker.getCurrentState() : null,
      leaderboard: this.services.raceStateTracker ? this.services.raceStateTracker.getLeaderboard() : [],
      latestSnapshot: this.services.dataAggregator ? this.services.dataAggregator.getLatestSnapshot() : null,
      analytics: this.services.analyticsEngine ? this.services.analyticsEngine.getStatusSummary() : null
    };
  }

  // Get car data
  getCarData(carId) {
    return this.services.dataAggregator ?
      this.services.dataAggregator.getCarDetails(carId) :
      null;
  }

  // Get system health
  getHealth() {
    const status = this.getSystemStatus();

    return {
      overall: this.isRunning ? 'healthy' : 'stopped',
      services: status.services,
      issues: this.checkForIssues(),
      timestamp: new Date().toISOString()
    };
  }

  // Check for system issues
  checkForIssues() {
    const issues = [];
    const status = this.getSystemStatus();

    // Check if services are running
    Object.entries(status.services).forEach(([service, state]) => {
      if (state === 'inactive') {
        issues.push(`${service} is not running`);
      }
    });

    // Check cache stats
    if (status.stats.cache) {
      if (status.stats.cache.size > status.stats.cache.maxSize * 0.9) {
        issues.push('Cache is near capacity');
      }
    }

    // Check time-series stats
    if (status.stats.timeSeries) {
      if (status.stats.timeSeries.totalPoints > 90000) { // Near 100k limit
        issues.push('Time-series database is near capacity');
      }
    }

    return issues;
  }

  // Reset system
  async reset() {
    try {
      logger.info('Resetting Race Telemetry System...');

      await this.stop();

      // Clear data
      this.services.cacheService.clear();
      this.services.timeSeriesDB.clear();
      this.services.dataAggregator.clearSnapshots();
      this.services.raceStateTracker.resetRace();

      // Restart
      await this.start();

      logger.info('Race Telemetry System reset successfully');

    } catch (error) {
      logger.error('Error resetting race telemetry system:', error);
      throw error;
    }
  }

  // Export system data
  exportData() {
    return {
      metadata: this.services.metadataStore ? this.services.metadataStore.export() : null,
      timeSeries: this.services.timeSeriesDB ? this.services.timeSeriesDB.exportData() : null,
      cache: this.services.cacheService ? this.services.cacheService.getStats() : null,
      timestamp: new Date().toISOString()
    };
  }

  // Get service references for external access
  getServices() {
    return this.services;
  }
}

export default RaceTelemetrySystem;