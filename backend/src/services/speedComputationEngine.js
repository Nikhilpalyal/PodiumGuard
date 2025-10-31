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

class SpeedComputationEngine {
  constructor() {
    this.carHistory = new Map(); // carId -> speed history
    this.maxHistorySize = 100; // Keep last 100 speed readings
    this.updateInterval = 1000; // 1 second updates
    this.listeners = [];
  }

  // Subscribe to speed updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of speed updates
  notify(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error notifying speed listener:', error);
      }
    });
  }

  // Process telemetry data and compute speeds
  processTelemetry(telemetryData) {
    try {
      const speedData = {
        timestamp: telemetryData.timestamp,
        cars: []
      };

      telemetryData.cars.forEach(car => {
        const computedSpeeds = this.computeCarSpeeds(car);
        speedData.cars.push({
          carId: car.carId,
          ...computedSpeeds
        });
      });

      this.notify(speedData);
      return speedData;

    } catch (error) {
      logger.error('Error processing speed telemetry:', error);
      return null;
    }
  }

  // Compute all speed metrics for a car
  computeCarSpeeds(car) {
    const carId = car.carId;
    const currentSpeed = car.speed;

    // Initialize history if needed
    if (!this.carHistory.has(carId)) {
      this.carHistory.set(carId, []);
    }

    const history = this.carHistory.get(carId);

    // Add current speed to history
    history.push({
      speed: currentSpeed,
      timestamp: new Date(car.timestamp).getTime(),
      position: car.position
    });

    // Maintain history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Calculate metrics
    const metrics = {
      current: currentSpeed,
      average: this.calculateAverageSpeed(history),
      max: this.calculateMaxSpeed(history),
      min: this.calculateMinSpeed(history),
      trend: this.calculateSpeedTrend(history),
      acceleration: this.calculateAcceleration(history),
      sectorSpeeds: this.calculateSectorSpeeds(car, history),
      lapTimes: this.calculateLapTimes(car, history),
      performance: this.assessPerformance(car, history)
    };

    return metrics;
  }

  // Calculate average speed from history
  calculateAverageSpeed(history) {
    if (history.length === 0) return 0;

    const sum = history.reduce((acc, point) => acc + point.speed, 0);
    return Math.round(sum / history.length);
  }

  // Calculate maximum speed from history
  calculateMaxSpeed(history) {
    if (history.length === 0) return 0;

    return Math.max(...history.map(point => point.speed));
  }

  // Calculate minimum speed from history
  calculateMinSpeed(history) {
    if (history.length === 0) return 0;

    return Math.min(...history.map(point => point.speed));
  }

  // Calculate speed trend (acceleration/deceleration)
  calculateSpeedTrend(history) {
    if (history.length < 2) return 0;

    const recent = history.slice(-5); // Last 5 points
    if (recent.length < 2) return 0;

    const first = recent[0].speed;
    const last = recent[recent.length - 1].speed;

    return last - first; // Positive = accelerating, negative = decelerating
  }

  // Calculate acceleration (m/s²)
  calculateAcceleration(history) {
    if (history.length < 2) return 0;

    const recent = history.slice(-2);
    const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 1000; // seconds
    const speedDiff = (recent[1].speed - recent[0].speed) * 1000 / 3600; // m/s

    if (timeDiff === 0) return 0;

    return speedDiff / timeDiff;
  }

  // Calculate sector speeds
  calculateSectorSpeeds(car, history) {
    const sectorData = {
      1: [],
      2: [],
      3: []
    };

    // Group speeds by sector
    history.forEach(point => {
      if (point.sector && sectorData[point.sector]) {
        sectorData[point.sector].push(point.speed);
      }
    });

    // Calculate averages for each sector
    const sectorSpeeds = {};
    Object.keys(sectorData).forEach(sector => {
      const speeds = sectorData[sector];
      if (speeds.length > 0) {
        sectorSpeeds[`sector${sector}`] = {
          average: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
          max: Math.max(...speeds),
          min: Math.min(...speeds)
        };
      }
    });

    return sectorSpeeds;
  }

  // Calculate lap times (simplified)
  calculateLapTimes(car, history) {
    // This would need lap start/end detection in a real implementation
    // For now, return mock data
    return {
      current: car.lapNumber,
      lastLapTime: 85.5 + Math.random() * 10, // seconds
      bestLapTime: 82.3,
      averageLapTime: 87.2
    };
  }

  // Assess car performance
  assessPerformance(car, history) {
    if (history.length < 10) return 'insufficient_data';

    const avgSpeed = this.calculateAverageSpeed(history);
    const trend = this.calculateSpeedTrend(history);
    const maxSpeed = this.calculateMaxSpeed(history);

    // Performance assessment logic
    if (maxSpeed > 350) return 'exceptional';
    if (avgSpeed > 320 && trend > 0) return 'strong';
    if (avgSpeed > 300 && Math.abs(trend) < 5) return 'steady';
    if (trend < -10) return 'declining';
    if (avgSpeed < 280) return 'struggling';

    return 'normal';
  }

  // Get speed statistics for a specific car
  getCarSpeedStats(carId) {
    const history = this.carHistory.get(carId);
    if (!history || history.length === 0) {
      return null;
    }

    const latest = history[history.length - 1];

    return {
      carId,
      current: latest.speed,
      average: this.calculateAverageSpeed(history),
      max: this.calculateMaxSpeed(history),
      min: this.calculateMinSpeed(history),
      trend: this.calculateSpeedTrend(history),
      acceleration: this.calculateAcceleration(history),
      performance: this.assessPerformance({ carId }, history),
      history: history.slice(-20) // Last 20 points
    };
  }

  // Get speed statistics for all cars
  getAllSpeedStats() {
    const stats = {};

    this.carHistory.forEach((history, carId) => {
      stats[carId] = this.getCarSpeedStats(carId);
    });

    return stats;
  }

  // Clear history for a car
  clearCarHistory(carId) {
    this.carHistory.delete(carId);
  }

  // Clear all history
  clearAllHistory() {
    this.carHistory.clear();
  }

  // Get performance summary
  getPerformanceSummary() {
    const allStats = this.getAllSpeedStats();
    const cars = Object.values(allStats);

    if (cars.length === 0) return null;

    return {
      totalCars: cars.length,
      averageSpeed: Math.round(cars.reduce((sum, car) => sum + car.average, 0) / cars.length),
      fastestCar: cars.reduce((fastest, car) => car.max > fastest.max ? car : fastest),
      slowestCar: cars.reduce((slowest, car) => car.min < slowest.min ? car : slowest),
      acceleratingCars: cars.filter(car => car.trend > 5).length,
      deceleratingCars: cars.filter(car => car.trend < -5).length,
      timestamp: new Date().toISOString()
    };
  }
}

export default SpeedComputationEngine;