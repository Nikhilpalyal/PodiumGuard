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

class ErrorLogger {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.errors = [];
    this.warnings = [];
    this.maxLogEntries = 10000;
    this.isActive = false;

    // Error categorization
    this.errorCategories = {
      TELEMETRY: 'telemetry',
      WEBSOCKET: 'websocket',
      DATABASE: 'database',
      CACHE: 'cache',
      AI: 'ai',
      BLOCKCHAIN: 'blockchain',
      SECURITY: 'security',
      SYSTEM: 'system',
      NETWORK: 'network'
    };

    // Error severity levels
    this.severityLevels = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };

    this.listeners = [];
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      recentErrors: 0,
      errorRate: 0
    };

    this.ensureLogDirectory();
  }

  // Subscribe to error events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of error events
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error notifying error logger listener:', error);
      }
    });
  }

  // Start error logging
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Start error rate monitoring
    this.startErrorRateMonitoring();

    logger.info('Error Logger started');
  }

  // Stop error logging
  stop() {
    this.isActive = false;
    logger.info('Error Logger stopped');
  }

  // Log an error
  logError(error, category = 'SYSTEM', severity = 'MEDIUM', metadata = {}) {
    try {
      const errorEntry = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        category: this.errorCategories[category] || category.toLowerCase(),
        severity: severity.toUpperCase(),
        severityLevel: this.severityLevels[severity.toUpperCase()] || 2,
        message: error.message || error.toString(),
        stack: error.stack,
        metadata,
        resolved: false,
        resolution: null
      };

      // Add to appropriate collection
      if (severity.toUpperCase() === 'LOW' || severity.toUpperCase() === 'MEDIUM') {
        this.warnings.push(errorEntry);
      } else {
        this.errors.push(errorEntry);
      }

      // Maintain log size limits
      this.maintainLogSize();

      // Update statistics
      this.updateErrorStats(errorEntry);

      // Log to winston
      logger.error(`[${category}] ${errorEntry.message}`, {
        errorId: errorEntry.id,
        severity,
        metadata
      });

      // Notify listeners
      this.notify({
        type: 'ERROR_LOGGED',
        error: errorEntry,
        timestamp: new Date().toISOString()
      });

      // Check for error patterns
      this.checkErrorPatterns(errorEntry);

      return errorEntry.id;

    } catch (loggingError) {
      console.error('Error in error logging:', loggingError);
      return null;
    }
  }

  // Log a warning
  logWarning(message, category = 'SYSTEM', metadata = {}) {
    return this.logError(new Error(message), category, 'LOW', metadata);
  }

  // Log system health issue
  logHealthIssue(component, issue, severity = 'MEDIUM') {
    return this.logError(
      new Error(`${component}: ${issue}`),
      'SYSTEM',
      severity,
      { component, issueType: 'health' }
    );
  }

  // Log data anomaly
  logDataAnomaly(anomalyType, data, severity = 'MEDIUM') {
    return this.logError(
      new Error(`Data anomaly: ${anomalyType}`),
      'TELEMETRY',
      severity,
      { anomalyType, data }
    );
  }

  // Log security event
  logSecurityEvent(eventType, details, severity = 'HIGH') {
    return this.logError(
      new Error(`Security event: ${eventType}`),
      'SECURITY',
      severity,
      { eventType, details }
    );
  }

  // Resolve an error
  resolveError(errorId, resolution = 'Manually resolved') {
    const error = this.findErrorById(errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;
      error.resolvedAt = new Date().toISOString();

      this.notify({
        type: 'ERROR_RESOLVED',
        errorId,
        resolution,
        timestamp: new Date().toISOString()
      });

      logger.info(`Error ${errorId} resolved: ${resolution}`);
      return true;
    }
    return false;
  }

  // Find error by ID
  findErrorById(errorId) {
    return [...this.errors, ...this.warnings].find(error => error.id === errorId);
  }

  // Generate unique error ID
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Maintain log size limits
  maintainLogSize() {
    if (this.errors.length > this.maxLogEntries) {
      this.errors = this.errors.slice(-this.maxLogEntries);
    }

    if (this.warnings.length > this.maxLogEntries) {
      this.warnings = this.warnings.slice(-this.maxLogEntries);
    }
  }

  // Update error statistics
  updateErrorStats(errorEntry) {
    this.errorStats.total++;

    // Update category stats
    if (!this.errorStats.byCategory[errorEntry.category]) {
      this.errorStats.byCategory[errorEntry.category] = 0;
    }
    this.errorStats.byCategory[errorEntry.category]++;

    // Update severity stats
    if (!this.errorStats.bySeverity[errorEntry.severity]) {
      this.errorStats.bySeverity[errorEntry.severity] = 0;
    }
    this.errorStats.bySeverity[errorEntry.severity]++;
  }

  // Start error rate monitoring
  startErrorRateMonitoring() {
    setInterval(() => {
      if (this.isActive) {
        this.calculateErrorRate();
        this.checkErrorThresholds();
      }
    }, 60000); // Check every minute
  }

  // Calculate error rate
  calculateErrorRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentErrors = [...this.errors, ...this.warnings].filter(
      error => new Date(error.timestamp).getTime() > oneMinuteAgo
    );

    this.errorStats.recentErrors = recentErrors.length;
    this.errorStats.errorRate = recentErrors.length; // errors per minute
  }

  // Check error thresholds
  checkErrorThresholds() {
    const thresholds = {
      errorRate: 10, // errors per minute
      criticalErrors: 5 // critical errors in recent history
    };

    // Check error rate
    if (this.errorStats.errorRate > thresholds.errorRate) {
      this.notify({
        type: 'ERROR_RATE_HIGH',
        rate: this.errorStats.errorRate,
        threshold: thresholds.errorRate,
        timestamp: new Date().toISOString()
      });
    }

    // Check critical errors
    const recentCritical = this.errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      const fiveMinutesAgo = Date.now() - 300000;
      return errorTime > fiveMinutesAgo && error.severity === 'CRITICAL';
    });

    if (recentCritical.length > thresholds.criticalErrors) {
      this.notify({
        type: 'CRITICAL_ERRORS_HIGH',
        count: recentCritical.length,
        threshold: thresholds.criticalErrors,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Check for error patterns
  checkErrorPatterns(errorEntry) {
    // Check for repeated errors of the same type
    const similarErrors = [...this.errors, ...this.warnings].filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      const tenMinutesAgo = Date.now() - 600000; // 10 minutes
      return errorTime > tenMinutesAgo &&
             error.category === errorEntry.category &&
             error.message === errorEntry.message;
    });

    if (similarErrors.length >= 3) {
      this.notify({
        type: 'ERROR_PATTERN_DETECTED',
        pattern: `${errorEntry.category}: ${errorEntry.message}`,
        occurrences: similarErrors.length,
        timeWindow: '10 minutes',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get error statistics
  getErrorStats() {
    return {
      ...this.errorStats,
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      unresolvedErrors: this.errors.filter(e => !e.resolved).length,
      unresolvedWarnings: this.warnings.filter(w => !w.resolved).length,
      timestamp: new Date().toISOString()
    };
  }

  // Get errors by category
  getErrorsByCategory(category, limit = 50) {
    const categoryErrors = [...this.errors, ...this.warnings]
      .filter(error => error.category === category)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return categoryErrors;
  }

  // Get errors by severity
  getErrorsBySeverity(severity, limit = 50) {
    const severityErrors = [...this.errors, ...this.warnings]
      .filter(error => error.severity === severity.toUpperCase())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return severityErrors;
  }

  // Get recent errors
  getRecentErrors(limit = 100, timeWindow = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeWindow;

    return [...this.errors, ...this.warnings]
      .filter(error => new Date(error.timestamp).getTime() > cutoff)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get unresolved errors
  getUnresolvedErrors(limit = 50) {
    return [...this.errors, ...this.warnings]
      .filter(error => !error.resolved)
      .sort((a, b) => b.severityLevel - a.severityLevel) // Sort by severity
      .slice(0, limit);
  }

  // Export error logs
  exportLogs(format = 'json', timeRange = null) {
    let logs = [...this.errors, ...this.warnings];

    // Filter by time range if specified
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      logs = logs.filter(error => new Date(error.timestamp).getTime() > cutoff);
    }

    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return logs;
  }

  // Convert logs to CSV
  convertToCSV(logs) {
    const headers = ['id', 'timestamp', 'category', 'severity', 'message', 'resolved', 'resolution'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.category,
      log.severity,
      `"${log.message.replace(/"/g, '""')}"`,
      log.resolved,
      log.resolution ? `"${log.resolution.replace(/"/g, '""')}"` : ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Persist logs to disk
  persistLogs() {
    try {
      const logsData = {
        errors: this.errors,
        warnings: this.warnings,
        stats: this.errorStats,
        exportTime: new Date().toISOString()
      };

      const filePath = path.join(this.logDir, 'error_logs.json');
      fs.writeFileSync(filePath, JSON.stringify(logsData, null, 2));

      logger.debug('Error logs persisted to disk');
    } catch (error) {
      console.error('Error persisting logs:', error);
    }
  }

  // Load persisted logs
  loadPersistedLogs() {
    try {
      const filePath = path.join(this.logDir, 'error_logs.json');

      if (fs.existsSync(filePath)) {
        const dataStr = fs.readFileSync(filePath, 'utf8');
        const persistedData = JSON.parse(dataStr);

        this.errors = persistedData.errors || [];
        this.warnings = persistedData.warnings || [];
        this.errorStats = persistedData.stats || this.errorStats;

        logger.info(`Loaded ${this.errors.length} errors and ${this.warnings.length} warnings from disk`);
      }
    } catch (error) {
      logger.error('Error loading persisted logs:', error);
    }
  }

  // Ensure log directory exists
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        logger.info(`Created log directory: ${this.logDir}`);
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // Clear all logs
  clearLogs() {
    this.errors = [];
    this.warnings = [];
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      recentErrors: 0,
      errorRate: 0
    };

    logger.info('Error logs cleared');
  }

  // Get error summary report
  getErrorSummary(timeRange = 86400000) { // 24 hours
    const cutoff = Date.now() - timeRange;
    const relevantLogs = [...this.errors, ...this.warnings]
      .filter(error => new Date(error.timestamp).getTime() > cutoff);

    const summary = {
      timeRange,
      totalErrors: relevantLogs.length,
      errorsByCategory: {},
      errorsBySeverity: {},
      unresolvedCount: relevantLogs.filter(e => !e.resolved).length,
      mostCommonError: null,
      timestamp: new Date().toISOString()
    };

    // Count by category and severity
    relevantLogs.forEach(error => {
      summary.errorsByCategory[error.category] = (summary.errorsByCategory[error.category] || 0) + 1;
      summary.errorsBySeverity[error.severity] = (summary.errorsBySeverity[error.severity] || 0) + 1;
    });

    // Find most common error
    const errorMessages = {};
    relevantLogs.forEach(error => {
      const key = `${error.category}:${error.message}`;
      errorMessages[key] = (errorMessages[key] || 0) + 1;
    });

    const mostCommon = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostCommon) {
      summary.mostCommonError = {
        message: mostCommon[0],
        count: mostCommon[1]
      };
    }

    return summary;
  }
}

export default ErrorLogger;