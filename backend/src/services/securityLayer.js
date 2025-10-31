import winston from 'winston';
import crypto from 'crypto';

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

class SecurityLayer {
  constructor() {
    this.isActive = false;
    this.authenticatedSources = new Set();
    this.dataIntegrityChecks = new Map();
    this.anomalyDetection = {
      enabled: true,
      thresholds: {
        speedAnomaly: 50, // km/h deviation
        positionJump: 1000, // meters
        dataFrequency: 0.5 // seconds
      }
    };
    this.encryptionEnabled = true;
    this.rateLimiting = {
      enabled: true,
      maxRequestsPerMinute: 60,
      currentRequests: new Map()
    };
    this.listeners = [];
  }

  // Subscribe to security events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of security events
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error notifying security listener:', error);
      }
    });
  }

  // Start security layer
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Start rate limiting cleanup
    this.startRateLimitCleanup();

    logger.info('Security Layer started');
  }

  // Stop security layer
  stop() {
    this.isActive = false;
    logger.info('Security Layer stopped');
  }

  // Authenticate data source
  authenticateSource(sourceId, credentials) {
    try {
      // Simplified authentication - in production, use proper auth
      const isValid = this.validateCredentials(credentials);

      if (isValid) {
        this.authenticatedSources.add(sourceId);

        this.notify({
          type: 'SOURCE_AUTHENTICATED',
          sourceId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Data source authenticated: ${sourceId}`);
        return true;
      } else {
        this.notify({
          type: 'AUTHENTICATION_FAILED',
          sourceId,
          reason: 'Invalid credentials',
          timestamp: new Date().toISOString()
        });

        logger.warn(`Authentication failed for source: ${sourceId}`);
        return false;
      }
    } catch (error) {
      logger.error('Error authenticating source:', error);
      return false;
    }
  }

  // Validate credentials (simplified)
  validateCredentials(credentials) {
    // In production, this would validate against a database or external service
    return credentials &&
           credentials.apiKey &&
           credentials.apiKey.length > 10 &&
           credentials.signature;
  }

  // Verify data integrity
  verifyDataIntegrity(data, sourceId, expectedHash = null) {
    try {
      if (!this.isAuthenticated(sourceId)) {
        throw new Error('Source not authenticated');
      }

      // Calculate data hash
      const dataHash = this.calculateDataHash(data);

      // Store hash for future verification
      this.dataIntegrityChecks.set(`${sourceId}:${Date.now()}`, dataHash);

      // If expected hash provided, verify against it
      if (expectedHash && dataHash !== expectedHash) {
        this.notify({
          type: 'DATA_INTEGRITY_VIOLATION',
          sourceId,
          expectedHash,
          actualHash: dataHash,
          timestamp: new Date().toISOString()
        });

        logger.warn(`Data integrity violation for source: ${sourceId}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying data integrity:', error);
      return false;
    }
  }

  // Check rate limiting
  checkRateLimit(sourceId) {
    if (!this.rateLimiting.enabled) return true;

    const now = Date.now();
    const minuteKey = `${sourceId}:${Math.floor(now / 60000)}`; // Per minute

    const current = this.rateLimiting.currentRequests.get(minuteKey) || 0;

    if (current >= this.rateLimiting.maxRequestsPerMinute) {
      this.notify({
        type: 'RATE_LIMIT_EXCEEDED',
        sourceId,
        currentRequests: current,
        limit: this.rateLimiting.maxRequestsPerMinute,
        timestamp: new Date().toISOString()
      });

      logger.warn(`Rate limit exceeded for source: ${sourceId}`);
      return false;
    }

    this.rateLimiting.currentRequests.set(minuteKey, current + 1);
    return true;
  }

  // Detect data anomalies
  detectAnomalies(data, sourceId, previousData = null) {
    if (!this.anomalyDetection.enabled) return [];

    const anomalies = [];

    try {
      data.cars.forEach(car => {
        const carAnomalies = this.detectCarAnomalies(car, sourceId, previousData);
        anomalies.push(...carAnomalies);
      });

      // Report anomalies
      if (anomalies.length > 0) {
        this.notify({
          type: 'ANOMALIES_DETECTED',
          sourceId,
          anomalies,
          timestamp: new Date().toISOString()
        });

        logger.warn(`${anomalies.length} anomalies detected for source: ${sourceId}`);
      }

    } catch (error) {
      logger.error('Error detecting anomalies:', error);
    }

    return anomalies;
  }

  // Detect anomalies in car data
  detectCarAnomalies(car, sourceId, previousData) {
    const anomalies = [];

    // Find previous car data
    const previousCar = previousData ?
      previousData.cars.find(c => c.carId === car.carId) : null;

    // Speed anomaly detection
    if (previousCar) {
      const speedDiff = Math.abs(car.speed - previousCar.speed);

      if (speedDiff > this.anomalyDetection.thresholds.speedAnomaly) {
        anomalies.push({
          type: 'SPEED_ANOMALY',
          carId: car.carId,
          severity: speedDiff > 100 ? 'CRITICAL' : 'WARNING',
          description: `Speed changed by ${speedDiff.toFixed(1)} km/h`,
          data: {
            currentSpeed: car.speed,
            previousSpeed: previousCar.speed,
            difference: speedDiff
          }
        });
      }

      // Position jump detection
      const positionDiff = this.calculatePositionDifference(car.position, previousCar.position);

      if (positionDiff > this.anomalyDetection.thresholds.positionJump) {
        anomalies.push({
          type: 'POSITION_JUMP',
          carId: car.carId,
          severity: 'WARNING',
          description: `Position jumped by ${positionDiff.toFixed(0)} meters`,
          data: {
            currentPosition: car.position,
            previousPosition: previousCar.position,
            difference: positionDiff
          }
        });
      }
    }

    // Data validation anomalies
    if (car.speed < 0 || car.speed > 400) {
      anomalies.push({
        type: 'INVALID_SPEED',
        carId: car.carId,
        severity: 'CRITICAL',
        description: `Invalid speed value: ${car.speed} km/h`,
        data: { speed: car.speed }
      });
    }

    // Tire temperature validation
    const tireTemps = [car.tireTemperatures.frontLeft, car.tireTemperatures.frontRight,
                      car.tireTemperatures.rearLeft, car.tireTemperatures.rearRight];

    tireTemps.forEach((temp, index) => {
      if (temp < 0 || temp > 150) {
        const positions = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];
        anomalies.push({
          type: 'INVALID_TIRE_TEMP',
          carId: car.carId,
          severity: 'WARNING',
          description: `Invalid tire temperature: ${temp}°C at ${positions[index]}`,
          data: { position: positions[index], temperature: temp }
        });
      }
    });

    return anomalies;
  }

  // Calculate position difference
  calculatePositionDifference(pos1, pos2) {
    if (!pos1 || !pos2) return 0;

    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = (pos1.z || 0) - (pos2.z || 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Encrypt data
  encryptData(data) {
    if (!this.encryptionEnabled) return data;

    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('race-telemetry-key', 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
        algorithm
      };
    } catch (error) {
      logger.error('Error encrypting data:', error);
      return data;
    }
  }

  // Decrypt data
  decryptData(encryptedData) {
    if (!encryptedData.encrypted) return encryptedData.data;

    try {
      const algorithm = encryptedData.algorithm || 'aes-256-cbc';
      const key = crypto.scryptSync('race-telemetry-key', 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');

      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting data:', error);
      return null;
    }
  }

  // Check if source is authenticated
  isAuthenticated(sourceId) {
    return this.authenticatedSources.has(sourceId);
  }

  // Calculate data hash
  calculateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Start rate limit cleanup
  startRateLimitCleanup() {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - 60000; // Remove entries older than 1 minute

      for (const [key, timestamp] of this.rateLimiting.currentRequests.entries()) {
        if (parseInt(key.split(':')[1]) * 60000 < cutoff) {
          this.rateLimiting.currentRequests.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  // Get security statistics
  getSecurityStats() {
    return {
      authenticatedSources: this.authenticatedSources.size,
      activeRateLimits: this.rateLimiting.currentRequests.size,
      integrityChecks: this.dataIntegrityChecks.size,
      anomalyDetection: this.anomalyDetection.enabled,
      encryptionEnabled: this.encryptionEnabled,
      rateLimitingEnabled: this.rateLimiting.enabled
    };
  }

  // Validate incoming data
  validateIncomingData(data, sourceId) {
    const validation = {
      authenticated: this.isAuthenticated(sourceId),
      rateLimited: this.checkRateLimit(sourceId),
      integrity: false,
      anomalies: []
    };

    if (!validation.authenticated || !validation.rateLimited) {
      return validation;
    }

    // Check data integrity
    validation.integrity = this.verifyDataIntegrity(data, sourceId);

    // Detect anomalies
    validation.anomalies = this.detectAnomalies(data, sourceId);

    // Overall validation result
    validation.valid = validation.authenticated &&
                      validation.rateLimited &&
                      validation.integrity &&
                      validation.anomalies.length === 0;

    return validation;
  }

  // Generate security report
  generateSecurityReport(timeRange = 3600000) { // 1 hour
    const cutoff = Date.now() - timeRange;

    // This would aggregate security events from a database in production
    return {
      timeRange,
      authenticatedSources: Array.from(this.authenticatedSources),
      recentAnomalies: [], // Would be populated from stored events
      rateLimitViolations: 0, // Would be counted from stored events
      integrityViolations: 0, // Would be counted from stored events
      timestamp: new Date().toISOString()
    };
  }

  // Reset security state
  reset() {
    this.authenticatedSources.clear();
    this.dataIntegrityChecks.clear();
    this.rateLimiting.currentRequests.clear();

    logger.info('Security layer reset');
  }

  // Configure security settings
  configure(settings) {
    if (settings.anomalyDetection) {
      Object.assign(this.anomalyDetection, settings.anomalyDetection);
    }

    if (settings.rateLimiting) {
      Object.assign(this.rateLimiting, settings.rateLimiting);
    }

    if (typeof settings.encryptionEnabled === 'boolean') {
      this.encryptionEnabled = settings.encryptionEnabled;
    }

    logger.info('Security settings updated');
  }
}

export default SecurityLayer;