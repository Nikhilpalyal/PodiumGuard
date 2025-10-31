import winston from 'winston';
import RaceDataFeed from './raceDataFeed.js';

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

class TelemetryCollector {
  constructor() {
    this.dataFeed = new RaceDataFeed();
    this.listeners = [];
    this.isRunning = false;
    this.collectedData = [];
    this.maxDataPoints = 1000; // Keep last 1000 data points
  }

  // Subscribe to processed telemetry data
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  notify(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error notifying telemetry listener:', error);
      }
    });
  }

  // Start collecting telemetry
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting Telemetry Collector...');

    // Subscribe to raw data feed
    this.unsubscribeFeed = this.dataFeed.subscribe((rawData) => {
      this.processRawData(rawData);
    });

    // Start the data feed
    await this.dataFeed.start();
  }

  // Stop collecting telemetry
  stop() {
    this.isRunning = false;
    if (this.unsubscribeFeed) {
      this.unsubscribeFeed();
    }
    this.dataFeed.stop();
    logger.info('Stopping Telemetry Collector...');
  }

  // Process raw data from feeds
  processRawData(rawData) {
    try {
      const processedData = {
        timestamp: rawData.timestamp,
        source: rawData.source,
        cars: rawData.cars.map(car => this.enrichCarData(car)),
        metadata: {
          totalCars: rawData.cars.length,
          activeCars: rawData.cars.filter(car => car.status === 'ON_TRACK').length,
          pitStops: rawData.cars.filter(car => car.status === 'PIT').length
        }
      };

      // Store processed data
      this.storeData(processedData);

      // Notify listeners
      this.notify(processedData);

    } catch (error) {
      logger.error('Error processing raw telemetry data:', error);
    }
  }

  // Enrich car data with additional telemetry
  enrichCarData(car) {
    const enriched = { ...car };

    // Add calculated fields
    enriched.speedKmh = car.speed;
    enriched.speedMph = Math.round(car.speed * 0.621371);

    // Add tire temperatures (simulated)
    enriched.tireTemperatures = {
      frontLeft: 85 + Math.random() * 20,
      frontRight: 85 + Math.random() * 20,
      rearLeft: 90 + Math.random() * 15,
      rearRight: 90 + Math.random() * 15
    };

    // Add engine data (simulated)
    enriched.engine = {
      rpm: 10000 + Math.random() * 4000,
      temperature: 95 + Math.random() * 15,
      oilPressure: 3.5 + Math.random() * 1.5,
      fuelPressure: 4.0 + Math.random() * 1.0
    };

    // Add aerodynamics (simulated)
    enriched.aerodynamics = {
      downforce: 3500 + Math.random() * 1000,
      drag: 1200 + Math.random() * 300
    };

    // Add suspension (simulated)
    enriched.suspension = {
      frontLeft: -15 + Math.random() * 30,
      frontRight: -15 + Math.random() * 30,
      rearLeft: -10 + Math.random() * 20,
      rearRight: -10 + Math.random() * 20
    };

    // Add brake data (simulated)
    enriched.brakes = {
      frontLeft: Math.random() * 100,
      frontRight: Math.random() * 100,
      rearLeft: Math.random() * 80,
      rearRight: Math.random() * 80,
      temperature: 300 + Math.random() * 400
    };

    // Add fuel data (simulated)
    enriched.fuel = {
      remaining: 80 + Math.random() * 20,
      consumption: 2.5 + Math.random() * 1.5,
      mixture: 'optimal'
    };

    return enriched;
  }

  // Store data with rotation
  storeData(data) {
    this.collectedData.push(data);

    // Rotate data to keep memory usage low
    if (this.collectedData.length > this.maxDataPoints) {
      this.collectedData.shift();
    }
  }

  // Get recent telemetry data
  getRecentData(limit = 100) {
    return this.collectedData.slice(-limit);
  }

  // Get data for specific car
  getCarData(carId, limit = 50) {
    const carData = this.collectedData
      .map(snapshot => ({
        timestamp: snapshot.timestamp,
        car: snapshot.cars.find(car => car.carId === carId)
      }))
      .filter(item => item.car)
      .slice(-limit);

    return carData;
  }

  // Get current race state
  getCurrentState() {
    if (this.collectedData.length === 0) return null;

    const latest = this.collectedData[this.collectedData.length - 1];
    return {
      timestamp: latest.timestamp,
      cars: latest.cars,
      metadata: latest.metadata,
      leaderboard: this.calculateLeaderboard(latest.cars)
    };
  }

  // Calculate current leaderboard
  calculateLeaderboard(cars) {
    return cars
      .filter(car => car.status === 'ON_TRACK')
      .sort((a, b) => {
        // Sort by lap number descending, then by sector
        if (a.lapNumber !== b.lapNumber) {
          return b.lapNumber - a.lapNumber;
        }
        return b.sector - a.sector;
      })
      .map((car, index) => ({
        position: index + 1,
        ...car
      }));
  }

  // Get telemetry statistics
  getStats() {
    if (this.collectedData.length === 0) return null;

    const latest = this.collectedData[this.collectedData.length - 1];
    const allSpeeds = latest.cars.map(car => car.speed);

    return {
      totalDataPoints: this.collectedData.length,
      activeCars: latest.metadata.activeCars,
      averageSpeed: Math.round(allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length),
      maxSpeed: Math.max(...allSpeeds),
      minSpeed: Math.min(...allSpeeds),
      lastUpdate: latest.timestamp
    };
  }
}

export default TelemetryCollector;