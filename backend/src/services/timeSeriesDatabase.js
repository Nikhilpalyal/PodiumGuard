import winston from 'winston';
import fs from 'fs';
import path from 'path';

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

class TimeSeriesDatabase {
  constructor(dataDir = './data/timeseries') {
    this.dataDir = dataDir;
    this.data = new Map(); // measurement -> data points
    this.retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    this.maxPointsPerMeasurement = 10000;
    this.persistenceInterval = 5 * 60 * 1000; // 5 minutes
    this.compressionEnabled = true;

    this.ensureDataDirectory();
    this.loadPersistedData();
    this.startPersistenceTimer();
    this.startCleanupTimer();
  }

  // Ensure data directory exists
  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info(`Created time-series data directory: ${this.dataDir}`);
      }
    } catch (error) {
      logger.error('Failed to create data directory:', error);
    }
  }

  // Insert data point
  insert(measurement, tags, fields, timestamp = Date.now()) {
    try {
      const key = this.createMeasurementKey(measurement, tags);

      if (!this.data.has(key)) {
        this.data.set(key, []);
      }

      const points = this.data.get(key);
      const dataPoint = {
        timestamp,
        fields,
        tags
      };

      points.push(dataPoint);

      // Maintain size limits
      this.maintainSizeLimits(key, points);

      // Compress if enabled
      if (this.compressionEnabled) {
        this.compressDataPoints(points);
      }

      return true;
    } catch (error) {
      logger.error('Error inserting data point:', error);
      return false;
    }
  }

  // Query data points
  query(measurement, tags = {}, timeRange = null, limit = 1000) {
    try {
      const matchingKeys = this.findMatchingKeys(measurement, tags);
      let allPoints = [];

      matchingKeys.forEach(key => {
        const points = this.data.get(key) || [];
        allPoints = allPoints.concat(points);
      });

      // Filter by time range
      if (timeRange) {
        const now = Date.now();
        const startTime = now - timeRange;
        allPoints = allPoints.filter(point => point.timestamp >= startTime);
      }

      // Sort by timestamp (newest first)
      allPoints.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      return allPoints.slice(0, limit);
    } catch (error) {
      logger.error('Error querying data:', error);
      return [];
    }
  }

  // Get aggregated data
  aggregate(measurement, tags = {}, timeRange = null, aggregation = 'avg', groupBy = null) {
    try {
      const points = this.query(measurement, tags, timeRange, 10000);

      if (points.length === 0) return null;

      if (!groupBy) {
        // Simple aggregation
        return this.aggregatePoints(points, aggregation);
      } else {
        // Grouped aggregation
        const groups = {};

        points.forEach(point => {
          const groupKey = point.tags[groupBy] || 'default';
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(point);
        });

        const result = {};
        Object.keys(groups).forEach(key => {
          result[key] = this.aggregatePoints(groups[key], aggregation);
        });

        return result;
      }
    } catch (error) {
      logger.error('Error aggregating data:', error);
      return null;
    }
  }

  // Aggregate points with given function
  aggregatePoints(points, aggregation) {
    if (points.length === 0) return null;

    const values = points.map(p => {
      // Assume we're aggregating the first field
      const fieldKeys = Object.keys(p.fields);
      return fieldKeys.length > 0 ? p.fields[fieldKeys[0]] : 0;
    }).filter(v => typeof v === 'number');

    if (values.length === 0) return null;

    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  // Create measurement key
  createMeasurementKey(measurement, tags) {
    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}=${tags[key]}`)
      .join(',');

    return tagString ? `${measurement},${tagString}` : measurement;
  }

  // Find matching keys for query
  findMatchingKeys(measurement, tags) {
    const matchingKeys = [];

    for (const key of this.data.keys()) {
      if (key.startsWith(measurement)) {
        const keyTags = this.parseTagsFromKey(key);

        // Check if all query tags match
        const matches = Object.keys(tags).every(tagKey =>
          keyTags[tagKey] === tags[tagKey]
        );

        if (matches) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  // Parse tags from measurement key
  parseTagsFromKey(key) {
    const parts = key.split(',');
    const tags = {};

    parts.slice(1).forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        tags[key] = value;
      }
    });

    return tags;
  }

  // Maintain size limits for measurements
  maintainSizeLimits(key, points) {
    if (points.length > this.maxPointsPerMeasurement) {
      // Keep only the most recent points
      const excess = points.length - this.maxPointsPerMeasurement;
      points.splice(0, excess);
    }

    // Remove old points based on retention period
    const cutoff = Date.now() - this.retentionPeriod;
    const validPoints = points.filter(point => point.timestamp >= cutoff);

    if (validPoints.length !== points.length) {
      this.data.set(key, validPoints);
    }
  }

  // Compress data points (simplified)
  compressDataPoints(points) {
    if (points.length < 10) return;

    // Simple compression: remove points that don't significantly change the trend
    const compressed = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length - 1; i++) {
      const prev = compressed[compressed.length - 1];
      const current = points[i];
      const next = points[i + 1];

      // Keep point if it represents a significant change
      const threshold = 0.05; // 5% change threshold
      const fieldKeys = Object.keys(current.fields);

      let keep = false;
      fieldKeys.forEach(key => {
        const prevValue = prev.fields[key] || 0;
        const currValue = current.fields[key] || 0;
        const nextValue = next.fields[key] || 0;

        if (Math.abs(currValue - prevValue) / Math.abs(prevValue || 1) > threshold ||
            Math.abs(nextValue - currValue) / Math.abs(currValue || 1) > threshold) {
          keep = true;
        }
      });

      if (keep) {
        compressed.push(current);
      }
    }

    compressed.push(points[points.length - 1]); // Always keep last point

    if (compressed.length < points.length) {
      points.length = 0;
      points.push(...compressed);
    }
  }

  // Persist data to disk
  persistData() {
    try {
      const dataToPersist = {};

      for (const [key, points] of this.data.entries()) {
        dataToPersist[key] = points;
      }

      const filePath = path.join(this.dataDir, 'timeseries.json');
      fs.writeFileSync(filePath, JSON.stringify(dataToPersist, null, 2));

      logger.debug('Time-series data persisted to disk');
    } catch (error) {
      logger.error('Error persisting time-series data:', error);
    }
  }

  // Load persisted data
  loadPersistedData() {
    try {
      const filePath = path.join(this.dataDir, 'timeseries.json');

      if (fs.existsSync(filePath)) {
        const dataStr = fs.readFileSync(filePath, 'utf8');
        const persistedData = JSON.parse(dataStr);

        for (const [key, points] of Object.entries(persistedData)) {
          this.data.set(key, points);
        }

        logger.info(`Loaded ${Object.keys(persistedData).length} measurements from disk`);
      }
    } catch (error) {
      logger.error('Error loading persisted data:', error);
    }
  }

  // Start persistence timer
  startPersistenceTimer() {
    setInterval(() => {
      this.persistData();
    }, this.persistenceInterval);
  }

  // Start cleanup timer
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Clean up every hour
  }

  // Clean up old data
  cleanup() {
    const cutoff = Date.now() - this.retentionPeriod;
    let cleanedMeasurements = 0;
    let cleanedPoints = 0;

    for (const [key, points] of this.data.entries()) {
      const originalLength = points.length;
      const validPoints = points.filter(point => point.timestamp >= cutoff);

      if (validPoints.length !== originalLength) {
        this.data.set(key, validPoints);
        cleanedPoints += (originalLength - validPoints.length);
        cleanedMeasurements++;
      }
    }

    if (cleanedPoints > 0) {
      logger.info(`Cleaned up ${cleanedPoints} old data points from ${cleanedMeasurements} measurements`);
    }
  }

  // Race-specific methods
  insertSpeedData(carId, speed, timestamp = Date.now()) {
    return this.insert('speed', { carId }, { value: speed }, timestamp);
  }

  insertPositionData(carId, position, timestamp = Date.now()) {
    return this.insert('position', { carId }, {
      x: position.x,
      y: position.y,
      z: position.z || 0
    }, timestamp);
  }

  insertTireTempData(carId, tireTemps, timestamp = Date.now()) {
    return this.insert('tire_temp', { carId }, tireTemps, timestamp);
  }

  insertEngineData(carId, engineData, timestamp = Date.now()) {
    return this.insert('engine', { carId }, engineData, timestamp);
  }

  // Query methods for race data
  getCarSpeedHistory(carId, timeRange = 3600000) { // 1 hour
    return this.query('speed', { carId }, timeRange);
  }

  getCarPositionHistory(carId, timeRange = 3600000) {
    return this.query('position', { carId }, timeRange);
  }

  getAverageSpeed(carId, timeRange = 3600000) {
    return this.aggregate('speed', { carId }, timeRange, 'avg');
  }

  getMaxSpeed(carId, timeRange = 3600000) {
    return this.aggregate('speed', { carId }, timeRange, 'max');
  }

  // Get database statistics
  getStats() {
    let totalPoints = 0;
    let totalMeasurements = this.data.size;
    let oldestPoint = Date.now();
    let newestPoint = 0;

    for (const points of this.data.values()) {
      totalPoints += points.length;
      if (points.length > 0) {
        oldestPoint = Math.min(oldestPoint, points[0].timestamp);
        newestPoint = Math.max(newestPoint, points[points.length - 1].timestamp);
      }
    }

    return {
      measurements: totalMeasurements,
      totalPoints,
      averagePointsPerMeasurement: totalMeasurements > 0 ? totalPoints / totalMeasurements : 0,
      oldestPoint: oldestPoint === Date.now() ? null : oldestPoint,
      newestPoint: newestPoint === 0 ? null : newestPoint,
      retentionPeriod: this.retentionPeriod,
      maxPointsPerMeasurement: this.maxPointsPerMeasurement,
      compressionEnabled: this.compressionEnabled
    };
  }

  // Clear all data
  clear() {
    this.data.clear();
    logger.info('Time-series database cleared');
  }

  // Set retention period
  setRetentionPeriod(period) {
    this.retentionPeriod = period;
    logger.info(`Retention period set to: ${period}ms`);
  }

  // Set max points per measurement
  setMaxPointsPerMeasurement(max) {
    this.maxPointsPerMeasurement = max;
    logger.info(`Max points per measurement set to: ${max}`);
  }
}

export default TimeSeriesDatabase;