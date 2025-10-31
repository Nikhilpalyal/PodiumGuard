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

class MonitoringDashboard {
  constructor() {
    this.metrics = {
      system: {
        uptime: 0,
        startTime: Date.now(),
        memoryUsage: 0,
        cpuUsage: 0
      },
      telemetry: {
        totalDataPoints: 0,
        dataRate: 0,
        activeCars: 0,
        errors: 0
      },
      websocket: {
        activeConnections: 0,
        messagesSent: 0,
        messagesReceived: 0
      },
      cache: {
        hitRate: 0,
        size: 0,
        evictions: 0
      },
      database: {
        connections: 0,
        queries: 0,
        errors: 0
      },
      ai: {
        predictions: 0,
        accuracy: 0,
        processingTime: 0
      },
      blockchain: {
        blocks: 0,
        transactions: 0,
        pendingTx: 0
      },
      security: {
        authAttempts: 0,
        anomalies: 0,
        violations: 0
      }
    };

    this.alerts = [];
    this.thresholds = {
      memoryUsage: 80, // percentage
      cpuUsage: 70, // percentage
      errorRate: 5, // errors per minute
      dataRate: 10, // data points per second
      websocketConnections: 1000
    };

    this.isActive = false;
    this.updateInterval = 5000; // 5 seconds
    this.listeners = [];
  }

  // Subscribe to monitoring updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of monitoring updates
  notify(update) {
    this.listeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        logger.error('Error notifying monitoring listener:', error);
      }
    });
  }

  // Start monitoring
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Monitoring Dashboard started');
  }

  // Stop monitoring
  stop() {
    this.isActive = false;
    logger.info('Monitoring Dashboard stopped');
  }

  // Start metrics collection
  startMetricsCollection() {
    setInterval(() => {
      if (this.isActive) {
        this.collectSystemMetrics();
        this.checkThresholds();
        this.notify({
          type: 'METRICS_UPDATE',
          metrics: this.metrics,
          timestamp: new Date().toISOString()
        });
      }
    }, this.updateInterval);
  }

  // Collect system metrics
  collectSystemMetrics() {
    // Update uptime
    this.metrics.system.uptime = Date.now() - this.metrics.system.startTime;

    // Memory usage (simplified)
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    // CPU usage (simplified - would need more complex calculation)
    this.metrics.system.cpuUsage = Math.round(Math.random() * 30 + 20); // Mock CPU usage
  }

  // Update telemetry metrics
  updateTelemetryMetrics(data) {
    this.metrics.telemetry.totalDataPoints++;
    this.metrics.telemetry.activeCars = data.cars ? data.cars.length : 0;

    // Calculate data rate (simplified)
    this.metrics.telemetry.dataRate = Math.round(this.metrics.telemetry.totalDataPoints / (this.metrics.system.uptime / 1000));
  }

  // Update WebSocket metrics
  updateWebSocketMetrics(stats) {
    this.metrics.websocket.activeConnections = stats.activeConnections || 0;
    this.metrics.websocket.messagesSent = stats.messagesSent || 0;
    this.metrics.websocket.messagesReceived = stats.messagesReceived || 0;
  }

  // Update cache metrics
  updateCacheMetrics(stats) {
    this.metrics.cache.hitRate = stats.hitRate || 0;
    this.metrics.cache.size = stats.size || 0;
    this.metrics.cache.evictions = stats.evictions || 0;
  }

  // Update database metrics
  updateDatabaseMetrics(stats) {
    this.metrics.database.connections = stats.connections || 0;
    this.metrics.database.queries = stats.queries || 0;
    this.metrics.database.errors = stats.errors || 0;
  }

  // Update AI metrics
  updateAIMetrics(stats) {
    this.metrics.ai.predictions = stats.predictions || 0;
    this.metrics.ai.accuracy = stats.accuracy || 0;
    this.metrics.ai.processingTime = stats.processingTime || 0;
  }

  // Update blockchain metrics
  updateBlockchainMetrics(stats) {
    this.metrics.blockchain.blocks = stats.blocks || 0;
    this.metrics.blockchain.transactions = stats.transactions || 0;
    this.metrics.blockchain.pendingTx = stats.pendingTx || 0;
  }

  // Update security metrics
  updateSecurityMetrics(stats) {
    this.metrics.security.authAttempts = stats.authAttempts || 0;
    this.metrics.security.anomalies = stats.anomalies || 0;
    this.metrics.security.violations = stats.violations || 0;
  }

  // Check thresholds and generate alerts
  checkThresholds() {
    const alerts = [];

    // Memory usage alert
    if (this.metrics.system.memoryUsage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'MEMORY_HIGH',
        severity: 'WARNING',
        message: `Memory usage is ${this.metrics.system.memoryUsage}%`,
        value: this.metrics.system.memoryUsage,
        threshold: this.thresholds.memoryUsage,
        timestamp: new Date().toISOString()
      });
    }

    // CPU usage alert
    if (this.metrics.system.cpuUsage > this.thresholds.cpuUsage) {
      alerts.push({
        type: 'CPU_HIGH',
        severity: 'WARNING',
        message: `CPU usage is ${this.metrics.system.cpuUsage}%`,
        value: this.metrics.system.cpuUsage,
        threshold: this.thresholds.cpuUsage,
        timestamp: new Date().toISOString()
      });
    }

    // WebSocket connections alert
    if (this.metrics.websocket.activeConnections > this.thresholds.websocketConnections) {
      alerts.push({
        type: 'CONNECTIONS_HIGH',
        severity: 'INFO',
        message: `${this.metrics.websocket.activeConnections} active WebSocket connections`,
        value: this.metrics.websocket.activeConnections,
        threshold: this.thresholds.websocketConnections,
        timestamp: new Date().toISOString()
      });
    }

    // Data rate alert
    if (this.metrics.telemetry.dataRate > this.thresholds.dataRate) {
      alerts.push({
        type: 'DATA_RATE_HIGH',
        severity: 'INFO',
        message: `Data rate is ${this.metrics.telemetry.dataRate} points/second`,
        value: this.metrics.telemetry.dataRate,
        threshold: this.thresholds.dataRate,
        timestamp: new Date().toISOString()
      });
    }

    // Add alerts to history
    this.alerts.push(...alerts);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Notify of new alerts
    alerts.forEach(alert => {
      this.notify({
        type: 'ALERT',
        alert,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Log error
  logError(component, error, metadata = {}) {
    this.metrics.telemetry.errors++;

    const errorLog = {
      component,
      error: error.message || error,
      metadata,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    logger.error(`[${component}] ${error.message || error}`, metadata);

    // Check error rate
    const recentErrors = this.getRecentErrors(60); // Last minute
    if (recentErrors.length > this.thresholds.errorRate) {
      this.notify({
        type: 'ERROR_RATE_HIGH',
        message: `${recentErrors.length} errors in the last minute`,
        errors: recentErrors,
        timestamp: new Date().toISOString()
      });
    }

    return errorLog;
  }

  // Get recent errors
  getRecentErrors(timeWindow = 60) { // seconds
    const cutoff = Date.now() - (timeWindow * 1000);
    return this.alerts.filter(alert =>
      alert.type === 'ERROR' &&
      new Date(alert.timestamp).getTime() > cutoff
    );
  }

  // Get dashboard data
  getDashboardData() {
    return {
      metrics: this.metrics,
      alerts: this.alerts.slice(-20), // Last 20 alerts
      health: this.getSystemHealth(),
      timestamp: new Date().toISOString()
    };
  }

  // Get system health status
  getSystemHealth() {
    const health = {
      overall: 'HEALTHY',
      components: {},
      issues: []
    };

    // Check each component
    const components = {
      system: this.checkSystemHealth(),
      telemetry: this.checkTelemetryHealth(),
      websocket: this.checkWebSocketHealth(),
      cache: this.checkCacheHealth(),
      database: this.checkDatabaseHealth(),
      ai: this.checkAIHealth(),
      blockchain: this.checkBlockchainHealth(),
      security: this.checkSecurityHealth()
    };

    health.components = components;

    // Determine overall health
    const unhealthyComponents = Object.values(components).filter(c => c.status !== 'HEALTHY');
    if (unhealthyComponents.length > 0) {
      health.overall = unhealthyComponents.some(c => c.status === 'CRITICAL') ? 'CRITICAL' : 'WARNING';
      health.issues = unhealthyComponents.map(c => c.message);
    }

    return health;
  }

  // Component health checks
  checkSystemHealth() {
    if (this.metrics.system.memoryUsage > 90) {
      return { status: 'CRITICAL', message: 'Memory usage critically high' };
    } else if (this.metrics.system.memoryUsage > 80) {
      return { status: 'WARNING', message: 'Memory usage high' };
    }
    return { status: 'HEALTHY', message: 'System operating normally' };
  }

  checkTelemetryHealth() {
    if (this.metrics.telemetry.errors > 10) {
      return { status: 'CRITICAL', message: 'High telemetry error rate' };
    } else if (this.metrics.telemetry.errors > 5) {
      return { status: 'WARNING', message: 'Elevated telemetry errors' };
    }
    return { status: 'HEALTHY', message: 'Telemetry system healthy' };
  }

  checkWebSocketHealth() {
    if (this.metrics.websocket.activeConnections > 1000) {
      return { status: 'WARNING', message: 'High number of WebSocket connections' };
    }
    return { status: 'HEALTHY', message: 'WebSocket system healthy' };
  }

  checkCacheHealth() {
    if (this.metrics.cache.hitRate < 0.5) {
      return { status: 'WARNING', message: 'Low cache hit rate' };
    }
    return { status: 'HEALTHY', message: 'Cache system healthy' };
  }

  checkDatabaseHealth() {
    if (this.metrics.database.errors > 5) {
      return { status: 'WARNING', message: 'Database errors detected' };
    }
    return { status: 'HEALTHY', message: 'Database system healthy' };
  }

  checkAIHealth() {
    if (this.metrics.ai.processingTime > 5000) { // 5 seconds
      return { status: 'WARNING', message: 'AI processing time high' };
    }
    return { status: 'HEALTHY', message: 'AI system healthy' };
  }

  checkBlockchainHealth() {
    if (this.metrics.blockchain.pendingTx > 100) {
      return { status: 'WARNING', message: 'High number of pending blockchain transactions' };
    }
    return { status: 'HEALTHY', message: 'Blockchain system healthy' };
  }

  checkSecurityHealth() {
    if (this.metrics.security.violations > 10) {
      return { status: 'CRITICAL', message: 'Security violations detected' };
    } else if (this.metrics.security.anomalies > 20) {
      return { status: 'WARNING', message: 'High number of anomalies detected' };
    }
    return { status: 'HEALTHY', message: 'Security system healthy' };
  }

  // Generate performance report
  generatePerformanceReport(timeRange = 3600000) { // 1 hour
    const cutoff = Date.now() - timeRange;

    return {
      timeRange,
      metrics: this.metrics,
      alerts: this.alerts.filter(alert => new Date(alert.timestamp).getTime() > cutoff),
      performance: {
        averageDataRate: this.metrics.telemetry.dataRate,
        averageMemoryUsage: this.metrics.system.memoryUsage,
        averageCPUUsage: this.metrics.system.cpuUsage,
        totalErrors: this.metrics.telemetry.errors,
        totalMessages: this.metrics.websocket.messagesSent
      },
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics
  resetMetrics() {
    // Reset counters but keep configuration
    this.metrics.telemetry.totalDataPoints = 0;
    this.metrics.telemetry.errors = 0;
    this.metrics.websocket.messagesSent = 0;
    this.metrics.websocket.messagesReceived = 0;
    this.metrics.database.queries = 0;
    this.metrics.database.errors = 0;
    this.metrics.ai.predictions = 0;
    this.metrics.security.authAttempts = 0;
    this.metrics.security.anomalies = 0;
    this.metrics.security.violations = 0;

    this.alerts = [];

    logger.info('Monitoring metrics reset');
  }

  // Configure thresholds
  configureThresholds(newThresholds) {
    Object.assign(this.thresholds, newThresholds);
    logger.info('Monitoring thresholds updated');
  }

  // Export monitoring data
  exportData() {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      thresholds: this.thresholds,
      health: this.getSystemHealth(),
      exportTime: new Date().toISOString()
    };
  }
}

export default MonitoringDashboard;