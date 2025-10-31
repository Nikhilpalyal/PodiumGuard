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

class DataAggregator {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 100; // Keep last 100 snapshots
    this.listeners = [];
    this.updateInterval = 1000; // 1 second updates
    this.isRunning = false;
  }

  // Subscribe to aggregated data updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of new snapshots
  notify(snapshot) {
    this.listeners.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        logger.error('Error notifying data aggregator listener:', error);
      }
    });
  }

  // Start aggregation process
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting Data Aggregator...');
  }

  // Stop aggregation
  stop() {
    this.isRunning = false;
    logger.info('Stopping Data Aggregator...');
  }

  // Aggregate data from all processing layers
  aggregateData(telemetryData, speedData, analyticsEvents, raceState) {
    try {
      if (!this.isRunning) return null;

      const snapshot = {
        timestamp: new Date().toISOString(),
        version: '1.0',

        // Core telemetry data
        telemetry: {
          cars: telemetryData.cars,
          metadata: telemetryData.metadata
        },

        // Speed computations
        speeds: speedData,

        // Analytics events (recent ones)
        events: analyticsEvents.slice(-10), // Last 10 events

        // Race state
        race: raceState,

        // Aggregated statistics
        stats: this.generateStats(telemetryData, speedData, analyticsEvents, raceState),

        // Performance summary
        performance: this.generatePerformanceSummary(telemetryData, speedData),

        // Alerts and warnings
        alerts: this.generateAlerts(analyticsEvents)
      };

      // Store snapshot
      this.snapshots.push(snapshot);

      // Maintain snapshot history
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots.shift();
      }

      // Notify listeners
      this.notify(snapshot);

      return snapshot;

    } catch (error) {
      logger.error('Error aggregating data:', error);
      return null;
    }
  }

  // Generate comprehensive statistics
  generateStats(telemetryData, speedData, analyticsEvents, raceState) {
    const cars = telemetryData.cars;
    const speeds = speedData.cars || [];

    return {
      // Car counts
      totalCars: cars.length,
      activeCars: cars.filter(car => car.status === 'ON_TRACK').length,
      pittedCars: cars.filter(car => car.status === 'PIT').length,
      retiredCars: cars.filter(car => ['DNF', 'OUT'].includes(car.status)).length,

      // Speed statistics
      speedStats: {
        average: speeds.length > 0 ? Math.round(speeds.reduce((sum, car) => sum + car.current, 0) / speeds.length) : 0,
        maximum: speeds.length > 0 ? Math.max(...speeds.map(car => car.max)) : 0,
        minimum: speeds.length > 0 ? Math.min(...speeds.map(car => car.min)) : 0
      },

      // Event statistics
      eventStats: {
        total: analyticsEvents.length,
        critical: analyticsEvents.filter(e => e.severity === 'CRITICAL').length,
        warnings: analyticsEvents.filter(e => e.severity === 'WARNING').length,
        info: analyticsEvents.filter(e => e.severity === 'INFO').length
      },

      // Race progress
      raceProgress: {
        currentLap: raceState.currentLap || 1,
        totalLaps: raceState.totalLaps || 58,
        completion: Math.round(((raceState.currentLap || 1) / (raceState.totalLaps || 58)) * 100),
        fastestLap: raceState.fastestLap
      },

      // System health
      systemHealth: {
        dataRate: 'GOOD', // Would be calculated based on update frequency
        latency: Math.round(Math.random() * 50 + 10), // Mock latency in ms
        uptime: Date.now() // Would track actual uptime
      }
    };
  }

  // Generate performance summary
  generatePerformanceSummary(telemetryData, speedData) {
    const cars = telemetryData.cars;
    const speeds = speedData.cars || [];

    // Group cars by performance status
    const performanceGroups = {
      exceptional: [],
      strong: [],
      steady: [],
      struggling: []
    };

    speeds.forEach(speedCar => {
      const performance = speedCar.performance;
      if (performanceGroups[performance]) {
        performanceGroups[performance].push(speedCar.carId);
      }
    });

    // Calculate sector performance
    const sectorPerformance = this.calculateSectorPerformance(cars);

    return {
      groups: performanceGroups,
      sectorPerformance,
      leader: speeds.length > 0 ? speeds.find(car => car.current === Math.max(...speeds.map(c => c.current))) : null,
      laggard: speeds.length > 0 ? speeds.find(car => car.current === Math.min(...speeds.map(c => c.current))) : null,
      averageSpeed: speeds.length > 0 ? Math.round(speeds.reduce((sum, car) => sum + car.current, 0) / speeds.length) : 0
    };
  }

  // Calculate sector performance
  calculateSectorPerformance(cars) {
    const sectors = { 1: [], 2: [], 3: [] };

    cars.forEach(car => {
      if (car.sector && sectors[car.sector]) {
        sectors[car.sector].push(car.speed);
      }
    });

    const sectorStats = {};
    Object.keys(sectors).forEach(sector => {
      const speeds = sectors[sector];
      if (speeds.length > 0) {
        sectorStats[`sector${sector}`] = {
          averageSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
          maxSpeed: Math.max(...speeds),
          minSpeed: Math.min(...speeds),
          carCount: speeds.length
        };
      }
    });

    return sectorStats;
  }

  // Generate alerts and warnings
  generateAlerts(analyticsEvents) {
    const recentEvents = analyticsEvents.slice(-20); // Last 20 events

    return {
      critical: recentEvents.filter(e => e.severity === 'CRITICAL'),
      warnings: recentEvents.filter(e => e.severity === 'WARNING'),
      info: recentEvents.filter(e => e.severity === 'INFO'),
      summary: {
        criticalCount: recentEvents.filter(e => e.severity === 'CRITICAL').length,
        warningCount: recentEvents.filter(e => e.severity === 'WARNING').length,
        infoCount: recentEvents.filter(e => e.severity === 'INFO').length
      }
    };
  }

  // Get latest snapshot
  getLatestSnapshot() {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  // Get snapshot history
  getSnapshotHistory(limit = 10) {
    return this.snapshots.slice(-limit);
  }

  // Get compact snapshot for WebSocket transmission
  getCompactSnapshot() {
    const latest = this.getLatestSnapshot();
    if (!latest) return null;

    // Create a lightweight version for real-time updates
    return {
      timestamp: latest.timestamp,
      cars: latest.telemetry.cars.map(car => ({
        id: car.carId,
        driver: car.driver,
        speed: car.speed,
        position: car.position,
        lap: car.lapNumber,
        sector: car.sector,
        status: car.status
      })),
      leaderboard: latest.race.leaderboard?.slice(0, 10) || [], // Top 10
      events: latest.alerts.critical.concat(latest.alerts.warnings).slice(-5), // Last 5 alerts
      stats: {
        activeCars: latest.stats.activeCars,
        averageSpeed: latest.stats.speedStats.average,
        currentLap: latest.stats.raceProgress.currentLap
      }
    };
  }

  // Get detailed data for specific car
  getCarDetails(carId) {
    const latest = this.getLatestSnapshot();
    if (!latest) return null;

    const car = latest.telemetry.cars.find(c => c.carId === carId);
    const speedData = latest.speeds.cars?.find(c => c.carId === carId);
    const carEvents = latest.events.filter(e => e.carId === carId);

    if (!car) return null;

    return {
      car,
      speedData,
      events: carEvents,
      position: latest.race.leaderboard?.findIndex(c => c.carId === carId) + 1 || 0
    };
  }

  // Get race overview
  getRaceOverview() {
    const latest = this.getLatestSnapshot();
    if (!latest) return null;

    return {
      race: latest.race,
      stats: latest.stats,
      performance: latest.performance,
      alerts: latest.alerts.summary
    };
  }

  // Export data for analysis
  exportData(format = 'json', timeRange = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeRange;
    const relevantSnapshots = this.snapshots.filter(
      snapshot => new Date(snapshot.timestamp).getTime() > cutoff
    );

    if (format === 'json') {
      return JSON.stringify(relevantSnapshots, null, 2);
    }

    // Could add CSV, XML formats here
    return relevantSnapshots;
  }

  // Clear all snapshots
  clearSnapshots() {
    this.snapshots = [];
    logger.info('Cleared all data snapshots');
  }

  // Get aggregator statistics
  getAggregatorStats() {
    return {
      totalSnapshots: this.snapshots.length,
      maxSnapshots: this.maxSnapshots,
      oldestSnapshot: this.snapshots.length > 0 ? this.snapshots[0].timestamp : null,
      newestSnapshot: this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].timestamp : null,
      memoryUsage: this.estimateMemoryUsage(),
      isRunning: this.isRunning
    };
  }

  // Estimate memory usage
  estimateMemoryUsage() {
    const snapshotSize = JSON.stringify(this.snapshots[0] || {}).length;
    return snapshotSize * this.snapshots.length;
  }
}

export default DataAggregator;