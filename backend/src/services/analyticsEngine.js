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

class AnalyticsEngine {
  constructor() {
    this.eventHistory = [];
    this.performanceThresholds = {
      speed: {
        green: 300,    // km/h
        yellow: 280,   // km/h
        red: 250       // km/h
      },
      tireTemp: {
        green: { min: 80, max: 110 },
        yellow: { min: 70, max: 120 },
        red: { min: 60, max: 130 }
      },
      engineTemp: {
        green: { min: 90, max: 110 },
        yellow: { min: 80, max: 120 },
        red: { min: 70, max: 130 }
      }
    };
    this.listeners = [];
  }

  // Subscribe to analytics events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of events
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error notifying analytics listener:', error);
      }
    });
  }

  // Process telemetry data and detect events
  processTelemetry(telemetryData) {
    try {
      const events = [];

      telemetryData.cars.forEach(car => {
        const carEvents = this.analyzeCar(car, telemetryData.timestamp);
        events.push(...carEvents);
      });

      // Store events
      this.eventHistory.push(...events);

      // Keep only recent events (last 1000)
      if (this.eventHistory.length > 1000) {
        this.eventHistory = this.eventHistory.slice(-1000);
      }

      // Notify listeners of new events
      events.forEach(event => this.notify(event));

      return events;

    } catch (error) {
      logger.error('Error processing analytics:', error);
      return [];
    }
  }

  // Analyze a single car for events
  analyzeCar(car, timestamp) {
    const events = [];

    // Speed drop detection
    const speedEvent = this.detectSpeedDrop(car, timestamp);
    if (speedEvent) events.push(speedEvent);

    // New lap record detection
    const lapRecordEvent = this.detectLapRecord(car, timestamp);
    if (lapRecordEvent) events.push(lapRecordEvent);

    // Safety flag triggers
    const safetyEvent = this.detectSafetyIssues(car, timestamp);
    if (safetyEvent) events.push(safetyEvent);

    // Performance status classification
    const statusEvent = this.classifyPerformanceStatus(car, timestamp);
    if (statusEvent) events.push(statusEvent);

    // Tire degradation
    const tireEvent = this.detectTireDegradation(car, timestamp);
    if (tireEvent) events.push(tireEvent);

    // Engine issues
    const engineEvent = this.detectEngineIssues(car, timestamp);
    if (engineEvent) events.push(engineEvent);

    return events;
  }

  // Detect speed drops
  detectSpeedDrop(car, timestamp) {
    const speed = car.speed;
    const thresholds = this.performanceThresholds.speed;

    if (speed < thresholds.red) {
      return {
        type: 'SPEED_DROP',
        severity: 'CRITICAL',
        carId: car.carId,
        driver: car.driver,
        message: `Critical speed drop detected: ${speed} km/h`,
        data: { speed, threshold: thresholds.red },
        timestamp,
        color: '🔴'
      };
    } else if (speed < thresholds.yellow) {
      return {
        type: 'SPEED_DROP',
        severity: 'WARNING',
        carId: car.carId,
        driver: car.driver,
        message: `Speed below optimal: ${speed} km/h`,
        data: { speed, threshold: thresholds.yellow },
        timestamp,
        color: '🟡'
      };
    }

    return null;
  }

  // Detect new lap records
  detectLapRecord(car, timestamp) {
    // Mock lap record detection
    // In a real system, this would compare against historical lap times
    const mockRecordTime = 82.3;
    const currentTime = 81.8 + Math.random() * 2;

    if (currentTime < mockRecordTime && Math.random() < 0.05) { // 5% chance
      return {
        type: 'LAP_RECORD',
        severity: 'INFO',
        carId: car.carId,
        driver: car.driver,
        message: `New lap record: ${currentTime.toFixed(3)}s`,
        data: { lapTime: currentTime, previousRecord: mockRecordTime },
        timestamp,
        color: '🟢'
      };
    }

    return null;
  }

  // Detect safety issues
  detectSafetyIssues(car, timestamp) {
    const issues = [];

    // Check tire temperatures
    const tireTemps = car.tireTemperatures;
    const avgTireTemp = (tireTemps.frontLeft + tireTemps.frontRight + tireTemps.rearLeft + tireTemps.rearRight) / 4;

    if (avgTireTemp > 125) {
      issues.push({
        type: 'SAFETY_FLAG',
        severity: 'CRITICAL',
        carId: car.carId,
        driver: car.driver,
        message: `Overheated tires: ${avgTireTemp.toFixed(1)}°C`,
        data: { tireTemp: avgTireTemp },
        timestamp,
        color: '🔴'
      });
    }

    // Check engine temperature
    const engineTemp = car.engine.temperature;
    if (engineTemp > 120) {
      issues.push({
        type: 'SAFETY_FLAG',
        severity: 'CRITICAL',
        carId: car.carId,
        driver: car.driver,
        message: `Engine overheating: ${engineTemp}°C`,
        data: { engineTemp },
        timestamp,
        color: '🔴'
      });
    }

    // Check brake temperature
    const brakeTemp = car.brakes.temperature;
    if (brakeTemp > 800) {
      issues.push({
        type: 'SAFETY_FLAG',
        severity: 'WARNING',
        carId: car.carId,
        driver: car.driver,
        message: `Brake fade risk: ${brakeTemp}°C`,
        data: { brakeTemp },
        timestamp,
        color: '🟡'
      });
    }

    return issues.length > 0 ? issues[0] : null; // Return first issue found
  }

  // Classify performance status
  classifyPerformanceStatus(car, timestamp) {
    const speed = car.speed;
    const thresholds = this.performanceThresholds.speed;

    let status, color, message;

    if (speed >= thresholds.green) {
      status = 'STABLE';
      color = '🟢';
      message = 'Optimal performance';
    } else if (speed >= thresholds.yellow) {
      status = 'AT_RISK';
      color = '🟡';
      message = 'Performance declining';
    } else {
      status = 'CRITICAL';
      color = '🔴';
      message = 'Critical performance issue';
    }

    return {
      type: 'PERFORMANCE_STATUS',
      severity: status === 'CRITICAL' ? 'CRITICAL' : status === 'AT_RISK' ? 'WARNING' : 'INFO',
      carId: car.carId,
      driver: car.driver,
      message: `${car.driver}: ${message}`,
      data: { status, speed, thresholds },
      timestamp,
      color
    };
  }

  // Detect tire degradation
  detectTireDegradation(car, timestamp) {
    const tires = car.tireTemperatures;
    const tirePressures = [tires.frontLeft, tires.frontRight, tires.rearLeft, tires.rearRight];

    // Check for uneven tire temperatures (indicating degradation)
    const maxTemp = Math.max(...tirePressures);
    const minTemp = Math.min(...tirePressures);
    const diff = maxTemp - minTemp;

    if (diff > 15 && Math.random() < 0.1) { // 10% chance when uneven
      return {
        type: 'TIRE_DEGRADATION',
        severity: 'WARNING',
        carId: car.carId,
        driver: car.driver,
        message: `Tire degradation detected: ${diff.toFixed(1)}°C difference`,
        data: { tireTemps: tires, difference: diff },
        timestamp,
        color: '🟡'
      };
    }

    return null;
  }

  // Detect engine issues
  detectEngineIssues(car, timestamp) {
    const engine = car.engine;

    if (engine.oilPressure < 2.5) {
      return {
        type: 'ENGINE_ISSUE',
        severity: 'CRITICAL',
        carId: car.carId,
        driver: car.driver,
        message: `Low oil pressure: ${engine.oilPressure} bar`,
        data: { oilPressure: engine.oilPressure },
        timestamp,
        color: '🔴'
      };
    }

    if (engine.fuelPressure < 3.0) {
      return {
        type: 'ENGINE_ISSUE',
        severity: 'WARNING',
        carId: car.carId,
        driver: car.driver,
        message: `Low fuel pressure: ${engine.fuelPressure} bar`,
        data: { fuelPressure: engine.fuelPressure },
        timestamp,
        color: '🟡'
      };
    }

    return null;
  }

  // Get current status summary
  getStatusSummary() {
    const recentEvents = this.eventHistory.slice(-50); // Last 50 events

    const summary = {
      totalEvents: this.eventHistory.length,
      recentEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'CRITICAL').length,
      warningEvents: recentEvents.filter(e => e.severity === 'WARNING').length,
      infoEvents: recentEvents.filter(e => e.severity === 'INFO').length,
      carsAtRisk: new Set(recentEvents.filter(e => e.severity === 'CRITICAL' || e.severity === 'WARNING').map(e => e.carId)).size,
      timestamp: new Date().toISOString()
    };

    return summary;
  }

  // Get events for a specific car
  getCarEvents(carId, limit = 20) {
    return this.eventHistory
      .filter(event => event.carId === carId)
      .slice(-limit);
  }

  // Get events by type
  getEventsByType(type, limit = 20) {
    return this.eventHistory
      .filter(event => event.type === type)
      .slice(-limit);
  }

  // Clear event history
  clearHistory() {
    this.eventHistory = [];
  }
}

export default AnalyticsEngine;