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

class DataRateController {
  constructor() {
    this.isActive = false;
    this.currentDataRate = 60; // Hz (data points per second)
    this.targetDataRate = 60;
    this.maxDataRate = 120;
    this.minDataRate = 10;

    // Rate limiting
    this.rateLimiter = {
      tokens: this.currentDataRate,
      lastRefill: Date.now(),
      refillRate: this.currentDataRate / 1000 // tokens per millisecond
    };

    // Adaptive rate control
    this.adaptiveControl = {
      enabled: true,
      systemLoad: 0,
      networkLatency: 0,
      clientCount: 0,
      adjustmentFactor: 0.1
    };

    // Quality settings
    this.qualityLevels = {
      high: { rate: 120, compression: 'none' },
      medium: { rate: 60, compression: 'light' },
      low: { rate: 30, compression: 'heavy' },
      minimal: { rate: 10, compression: 'maximum' }
    };

    this.currentQuality = 'medium';
    this.listeners = [];
    this.metrics = {
      processedDataPoints: 0,
      droppedDataPoints: 0,
      averageLatency: 0,
      rateAdjustments: 0
    };
  }

  // Subscribe to rate control events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of rate control events
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error notifying rate control listener:', error);
      }
    });
  }

  // Start rate controller
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Start adaptive control
    this.startAdaptiveControl();

    logger.info(`Data Rate Controller started at ${this.currentDataRate} Hz`);
  }

  // Stop rate controller
  stop() {
    this.isActive = false;
    logger.info('Data Rate Controller stopped');
  }

  // Check if data should be processed
  shouldProcessData() {
    if (!this.isActive) return true;

    const now = Date.now();
    const timePassed = now - this.rateLimiter.lastRefill;
    const tokensToAdd = timePassed * this.rateLimiter.refillRate;

    this.rateLimiter.tokens = Math.min(this.currentDataRate, this.rateLimiter.tokens + tokensToAdd);
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens -= 1;
      this.metrics.processedDataPoints++;
      return true;
    } else {
      this.metrics.droppedDataPoints++;
      return false;
    }
  }

  // Set target data rate
  setTargetDataRate(rate) {
    const clampedRate = Math.max(this.minDataRate, Math.min(this.maxDataRate, rate));

    if (clampedRate !== this.targetDataRate) {
      this.targetDataRate = clampedRate;
      this.notify({
        type: 'RATE_CHANGE',
        oldRate: this.currentDataRate,
        newRate: clampedRate,
        timestamp: new Date().toISOString()
      });

      logger.info(`Target data rate set to ${clampedRate} Hz`);
    }
  }

  // Set quality level
  setQualityLevel(level) {
    if (this.qualityLevels[level]) {
      this.currentQuality = level;
      const newRate = this.qualityLevels[level].rate;
      this.setTargetDataRate(newRate);

      this.notify({
        type: 'QUALITY_CHANGE',
        level,
        rate: newRate,
        timestamp: new Date().toISOString()
      });

      logger.info(`Quality level set to ${level} (${newRate} Hz)`);
    }
  }

  // Start adaptive control
  startAdaptiveControl() {
    setInterval(() => {
      if (this.isActive && this.adaptiveControl.enabled) {
        this.performAdaptiveAdjustment();
      }
    }, 10000); // Adjust every 10 seconds
  }

  // Perform adaptive rate adjustment
  performAdaptiveAdjustment() {
    const loadFactor = this.calculateLoadFactor();
    const latencyFactor = this.calculateLatencyFactor();
    const clientFactor = this.calculateClientFactor();

    // Combined adjustment factor
    const adjustmentFactor = (loadFactor + latencyFactor + clientFactor) / 3;

    if (Math.abs(adjustmentFactor) > this.adaptiveControl.adjustmentFactor) {
      const rateChange = Math.round(this.currentDataRate * adjustmentFactor);
      const newRate = Math.max(this.minDataRate,
                              Math.min(this.maxDataRate,
                                      this.currentDataRate - rateChange));

      if (newRate !== this.currentDataRate) {
        this.currentDataRate = newRate;
        this.metrics.rateAdjustments++;

        this.notify({
          type: 'ADAPTIVE_ADJUSTMENT',
          oldRate: this.currentDataRate + rateChange,
          newRate,
          factors: { loadFactor, latencyFactor, clientFactor },
          timestamp: new Date().toISOString()
        });

        logger.info(`Adaptive adjustment: ${this.currentDataRate + rateChange}Hz -> ${newRate}Hz`);
      }
    }
  }

  // Calculate load factor
  calculateLoadFactor() {
    // Simplified load calculation
    const memoryUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    const cpuUsage = Math.random() * 0.3 + 0.2; // Mock CPU usage

    const load = (memoryUsage + cpuUsage) / 2;

    // If load > 0.8, reduce rate; if load < 0.3, increase rate
    if (load > 0.8) return 0.2; // Reduce by 20%
    if (load < 0.3) return -0.1; // Increase by 10%
    return 0;
  }

  // Calculate latency factor
  calculateLatencyFactor() {
    // Mock latency calculation
    const latency = Math.random() * 100 + 20; // 20-120ms

    // If latency > 100ms, reduce rate; if latency < 30ms, can increase
    if (latency > 100) return 0.15;
    if (latency < 30) return -0.05;
    return 0;
  }

  // Calculate client factor
  calculateClientFactor() {
    const clientCount = this.adaptiveControl.clientCount;

    // If many clients, reduce rate to prevent overload
    if (clientCount > 500) return 0.3;
    if (clientCount > 200) return 0.15;
    if (clientCount < 50) return -0.1;
    return 0;
  }

  // Update system metrics
  updateSystemMetrics(metrics) {
    if (metrics.load !== undefined) {
      this.adaptiveControl.systemLoad = metrics.load;
    }
    if (metrics.latency !== undefined) {
      this.adaptiveControl.networkLatency = metrics.latency;
    }
    if (metrics.clients !== undefined) {
      this.adaptiveControl.clientCount = metrics.clients;
    }
  }

  // Get current rate control status
  getStatus() {
    return {
      isActive: this.isActive,
      currentDataRate: this.currentDataRate,
      targetDataRate: this.targetDataRate,
      currentQuality: this.currentQuality,
      adaptiveControl: this.adaptiveControl.enabled,
      metrics: this.metrics,
      rateLimiter: {
        availableTokens: this.rateLimiter.tokens,
        refillRate: this.rateLimiter.refillRate
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get rate control statistics
  getStatistics() {
    const totalDataPoints = this.metrics.processedDataPoints + this.metrics.droppedDataPoints;
    const dropRate = totalDataPoints > 0 ? (this.metrics.droppedDataPoints / totalDataPoints) * 100 : 0;

    return {
      ...this.getStatus(),
      statistics: {
        totalProcessed: this.metrics.processedDataPoints,
        totalDropped: this.metrics.droppedDataPoints,
        dropRate: Math.round(dropRate * 100) / 100,
        averageLatency: this.metrics.averageLatency,
        rateAdjustments: this.metrics.rateAdjustments,
        efficiency: totalDataPoints > 0 ? (this.metrics.processedDataPoints / totalDataPoints) * 100 : 0
      }
    };
  }

  // Force rate adjustment
  forceRateAdjustment(newRate) {
    const clampedRate = Math.max(this.minDataRate, Math.min(this.maxDataRate, newRate));
    const oldRate = this.currentDataRate;

    this.currentDataRate = clampedRate;
    this.targetDataRate = clampedRate;

    // Reset rate limiter
    this.rateLimiter.tokens = clampedRate;
    this.rateLimiter.refillRate = clampedRate / 1000;

    this.notify({
      type: 'FORCED_RATE_ADJUSTMENT',
      oldRate,
      newRate: clampedRate,
      timestamp: new Date().toISOString()
    });

    logger.info(`Forced rate adjustment: ${oldRate}Hz -> ${clampedRate}Hz`);
  }

  // Emergency rate reduction
  emergencyRateReduction() {
    const emergencyRate = Math.max(10, this.currentDataRate * 0.5);
    this.forceRateAdjustment(emergencyRate);

    this.notify({
      type: 'EMERGENCY_RATE_REDUCTION',
      rate: emergencyRate,
      reason: 'System overload detected',
      timestamp: new Date().toISOString()
    });

    logger.warn(`Emergency rate reduction to ${emergencyRate}Hz`);
  }

  // Reset rate controller
  reset() {
    this.currentDataRate = 60;
    this.targetDataRate = 60;
    this.currentQuality = 'medium';
    this.rateLimiter.tokens = 60;
    this.rateLimiter.refillRate = 60 / 1000;
    this.metrics = {
      processedDataPoints: 0,
      droppedDataPoints: 0,
      averageLatency: 0,
      rateAdjustments: 0
    };

    logger.info('Data Rate Controller reset');
  }

  // Configure rate controller
  configure(config) {
    if (config.maxDataRate) this.maxDataRate = config.maxDataRate;
    if (config.minDataRate) this.minDataRate = config.minDataRate;
    if (config.adaptiveControl !== undefined) this.adaptiveControl.enabled = config.adaptiveControl;
    if (config.adjustmentFactor) this.adaptiveControl.adjustmentFactor = config.adjustmentFactor;

    logger.info('Data Rate Controller configuration updated');
  }

  // Get available quality levels
  getQualityLevels() {
    return this.qualityLevels;
  }

  // Estimate optimal rate for given conditions
  estimateOptimalRate(conditions) {
    const { clientCount = 100, systemLoad = 0.5, networkQuality = 'good' } = conditions;

    let baseRate = 60;

    // Adjust for client count
    if (clientCount > 500) baseRate *= 0.5;
    else if (clientCount > 200) baseRate *= 0.7;
    else if (clientCount < 50) baseRate *= 1.2;

    // Adjust for system load
    if (systemLoad > 0.8) baseRate *= 0.6;
    else if (systemLoad < 0.3) baseRate *= 1.1;

    // Adjust for network quality
    switch (networkQuality) {
      case 'poor': baseRate *= 0.5; break;
      case 'fair': baseRate *= 0.8; break;
      case 'good': baseRate *= 1.0; break;
      case 'excellent': baseRate *= 1.1; break;
    }

    return Math.max(this.minDataRate, Math.min(this.maxDataRate, Math.round(baseRate)));
  }
}

export default DataRateController;