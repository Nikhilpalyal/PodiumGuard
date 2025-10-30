import winston from 'winston';
import EventEmitter from 'events';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class SafeModeService extends EventEmitter {
  constructor(contractService, io) {
    super();
    this.contractService = contractService;
    this.io = io;
    
    // Configuration
    this.config = {
      highRiskThreshold: parseInt(process.env.HIGH_RISK_THRESHOLD || '75'),
      safeModeThreshold: parseInt(process.env.SAFE_MODE_THRESHOLD || '5'),
      emergencyThreshold: parseInt(process.env.EMERGENCY_THRESHOLD || '10'),
      timeWindow: parseInt(process.env.DETECTION_TIME_WINDOW || '60'), // seconds
      cooldownPeriod: parseInt(process.env.SAFE_MODE_COOLDOWN || '300'), // 5 minutes
    };
    
    // State tracking
    this.detectionHistory = [];
    this.currentMode = 'Normal';
    this.lastModeChange = null;
    this.isInCooldown = false;
    this.cooldownTimer = null;
    
    // Statistics
    this.stats = {
      totalDetections: 0,
      highRiskDetections: 0,
      safeModeActivations: 0,
      emergencyModeActivations: 0,
      lastDetection: null
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    logger.info('Safe Mode Service initialized', {
      thresholds: this.config
    });
  }

  recordDetection(riskScore) {
    const now = new Date();
    
    // Record detection
    this.detectionHistory.push({
      timestamp: now,
      riskScore: riskScore
    });
    
    // Update statistics
    this.stats.totalDetections++;
    this.stats.lastDetection = now;
    
    if (riskScore >= this.config.highRiskThreshold) {
      this.stats.highRiskDetections++;
      logger.info(`High-risk detection recorded: ${riskScore}%`);
      
      // Check for mode changes
      this.checkModeChange();
    }
    
    // Emit detection event
    this.emit('detection', {
      riskScore,
      timestamp: now,
      isHighRisk: riskScore >= this.config.highRiskThreshold
    });
    
    // Broadcast to WebSocket clients
    if (this.io) {
      this.io.emit('safe_mode_detection', {
        riskScore,
        timestamp: now.toISOString(),
        currentMode: this.currentMode,
        recentHighRiskCount: this.getRecentHighRiskCount()
      });
    }
  }

  checkModeChange() {
    if (this.isInCooldown) {
      logger.debug('Mode change check skipped - in cooldown period');
      return;
    }

    const recentHighRiskCount = this.getRecentHighRiskCount();
    const newMode = this.calculateRequiredMode(recentHighRiskCount);
    
    if (newMode !== this.currentMode) {
      this.changeModeToMode(newMode, `Detection count: ${recentHighRiskCount}`);
    }
  }

  calculateRequiredMode(recentHighRiskCount) {
    if (recentHighRiskCount >= this.config.emergencyThreshold) {
      return 'Emergency';
    } else if (recentHighRiskCount >= this.config.safeModeThreshold) {
      return 'Safe';
    } else {
      return 'Normal';
    }
  }

  async changeModeToMode(newMode, reason) {
    const previousMode = this.currentMode;
    
    try {
      // Update local state
      this.currentMode = newMode;
      this.lastModeChange = new Date();
      
      // Update statistics
      if (newMode === 'Safe') {
        this.stats.safeModeActivations++;
      } else if (newMode === 'Emergency') {
        this.stats.emergencyModeActivations++;
      }
      
      logger.warn(`System mode changed: ${previousMode} -> ${newMode} (${reason})`);
      
      // Update smart contract
      if (this.contractService) {
        try {
          const contractResult = await this.contractService.setSystemMode(newMode, reason);
          if (contractResult.success) {
            logger.info(`Contract updated with new mode: ${newMode}`);
          } else {
            logger.error('Failed to update contract mode:', contractResult.error);
          }
        } catch (error) {
          logger.error('Error updating contract mode:', error);
        }
      }
      
      // Broadcast mode change
      this.broadcastModeChange(previousMode, newMode, reason);
      
      // Emit event
      this.emit('modeChange', {
        previousMode,
        newMode,
        reason,
        timestamp: this.lastModeChange,
        recentDetections: this.getRecentHighRiskCount()
      });
      
      // Start cooldown for mode changes to prevent rapid switching
      this.startCooldown();
      
    } catch (error) {
      logger.error('Error changing system mode:', error);
      // Revert mode change on error
      this.currentMode = previousMode;
    }
  }

  async forceMode(mode, reason, override = false) {
    if (!['Normal', 'Safe', 'Emergency'].includes(mode)) {
      throw new Error('Invalid mode. Must be Normal, Safe, or Emergency');
    }
    
    if (this.isInCooldown && !override) {
      throw new Error('Cannot change mode during cooldown period');
    }
    
    logger.info(`Force changing mode to ${mode}: ${reason}`);
    await this.changeModeToMode(mode, `Manual override: ${reason}`);
  }

  getRecentHighRiskCount() {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.config.timeWindow * 1000);
    
    return this.detectionHistory.filter(detection => 
      detection.timestamp >= cutoffTime && 
      detection.riskScore >= this.config.highRiskThreshold
    ).length;
  }

  getRecentDetections(timeWindow = null) {
    const window = timeWindow || this.config.timeWindow;
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - window * 1000);
    
    return this.detectionHistory.filter(detection => 
      detection.timestamp >= cutoffTime
    );
  }

  startCooldown() {
    this.isInCooldown = true;
    
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
    }
    
    this.cooldownTimer = setTimeout(() => {
      this.isInCooldown = false;
      logger.info('Safe mode cooldown period ended');
      
      // Check if mode should change now that cooldown is over
      this.checkModeChange();
    }, this.config.cooldownPeriod * 1000);
    
    logger.info(`Safe mode cooldown started for ${this.config.cooldownPeriod} seconds`);
  }

  startCleanupInterval() {
    // Clean up old detections every minute
    setInterval(() => {
      this.cleanupOldDetections();
    }, 60000);
  }

  cleanupOldDetections() {
    const now = new Date();
    const maxAge = this.config.timeWindow * 2; // Keep twice the time window
    const cutoffTime = new Date(now.getTime() - maxAge * 1000);
    
    const initialCount = this.detectionHistory.length;
    this.detectionHistory = this.detectionHistory.filter(
      detection => detection.timestamp >= cutoffTime
    );
    
    const removedCount = initialCount - this.detectionHistory.length;
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old detections`);
    }
  }

  broadcastModeChange(previousMode, newMode, reason) {
    if (!this.io) return;
    
    const modeChangeData = {
      type: 'MODE_CHANGE',
      previousMode,
      newMode,
      reason,
      timestamp: new Date().toISOString(),
      recentDetections: this.getRecentHighRiskCount(),
      severity: this.getModeSeverity(newMode)
    };
    
    // Broadcast to all clients
    this.io.emit('system_mode_changed', modeChangeData);
    
    // Send emergency alert if entering emergency mode
    if (newMode === 'Emergency') {
      this.io.emit('emergency_alert', {
        type: 'EMERGENCY_MODE_ACTIVATED',
        reason,
        timestamp: new Date().toISOString(),
        recentDetections: this.getRecentHighRiskCount(),
        message: 'System has entered Emergency Mode due to high attack detection rate'
      });
    }
  }

  getModeSeverity(mode) {
    switch (mode) {
      case 'Emergency': return 'critical';
      case 'Safe': return 'warning';
      case 'Normal': return 'info';
      default: return 'info';
    }
  }

  getStatus() {
    const recentDetections = this.getRecentDetections();
    const recentHighRisk = this.getRecentHighRiskCount();
    
    return {
      currentMode: this.currentMode,
      isInCooldown: this.isInCooldown,
      lastModeChange: this.lastModeChange,
      recentDetections: recentDetections.length,
      recentHighRiskDetections: recentHighRisk,
      thresholds: this.config,
      statistics: this.stats,
      timeUntilCooldownEnd: this.isInCooldown && this.cooldownTimer 
        ? this.config.cooldownPeriod - Math.floor((Date.now() - this.lastModeChange?.getTime()) / 1000)
        : 0
    };
  }

  getDetectionTimeline(minutes = 10) {
    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60 * 1000);
    
    const timeline = [];
    const interval = 60 * 1000; // 1 minute intervals
    
    for (let time = startTime.getTime(); time <= now.getTime(); time += interval) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + interval);
      
      const detectionsInInterval = this.detectionHistory.filter(d => 
        d.timestamp >= intervalStart && d.timestamp < intervalEnd
      );
      
      const highRiskCount = detectionsInInterval.filter(d => 
        d.riskScore >= this.config.highRiskThreshold
      ).length;
      
      timeline.push({
        timestamp: intervalStart.toISOString(),
        totalDetections: detectionsInInterval.length,
        highRiskDetections: highRiskCount,
        avgRiskScore: detectionsInInterval.length > 0 
          ? detectionsInInterval.reduce((sum, d) => sum + d.riskScore, 0) / detectionsInInterval.length
          : 0
      });
    }
    
    return timeline;
  }

  updateConfiguration(newConfig) {
    const previousConfig = { ...this.config };
    
    // Validate and update configuration
    if (newConfig.highRiskThreshold !== undefined) {
      this.config.highRiskThreshold = Math.max(0, Math.min(100, newConfig.highRiskThreshold));
    }
    
    if (newConfig.safeModeThreshold !== undefined) {
      this.config.safeModeThreshold = Math.max(1, newConfig.safeModeThreshold);
    }
    
    if (newConfig.emergencyThreshold !== undefined) {
      this.config.emergencyThreshold = Math.max(this.config.safeModeThreshold, newConfig.emergencyThreshold);
    }
    
    if (newConfig.timeWindow !== undefined) {
      this.config.timeWindow = Math.max(10, Math.min(600, newConfig.timeWindow));
    }
    
    if (newConfig.cooldownPeriod !== undefined) {
      this.config.cooldownPeriod = Math.max(30, Math.min(1800, newConfig.cooldownPeriod));
    }
    
    logger.info('Safe mode configuration updated', {
      previous: previousConfig,
      current: this.config
    });
    
    // Re-evaluate current mode with new configuration
    if (!this.isInCooldown) {
      this.checkModeChange();
    }
  }

  reset() {
    logger.info('Resetting Safe Mode Service');
    
    this.detectionHistory = [];
    this.currentMode = 'Normal';
    this.lastModeChange = null;
    this.isInCooldown = false;
    
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    
    // Reset statistics (but keep totals)
    this.stats.lastDetection = null;
    
    this.emit('reset', {
      timestamp: new Date().toISOString()
    });
  }

  destroy() {
    logger.info('Destroying Safe Mode Service');
    
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
    }
    
    this.removeAllListeners();
  }
}

export default SafeModeService;