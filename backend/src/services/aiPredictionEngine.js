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

class AIPredictionEngine {
  constructor() {
    this.predictionHistory = [];
    this.maxHistorySize = 1000;
    this.listeners = [];
    this.isActive = false;

    // Prediction models (simplified)
    this.models = {
      speedPrediction: this.createSpeedPredictionModel(),
      incidentPrediction: this.createIncidentPredictionModel(),
      pitStrategy: this.createPitStrategyModel(),
      overtakePrediction: this.createOvertakePredictionModel()
    };
  }

  // Subscribe to predictions
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of predictions
  notify(prediction) {
    this.listeners.forEach(callback => {
      try {
        callback(prediction);
      } catch (error) {
        logger.error('Error notifying AI prediction listener:', error);
      }
    });
  }

  // Start AI prediction engine
  start() {
    if (this.isActive) return;
    this.isActive = true;
    logger.info('AI Prediction Engine started');
  }

  // Stop AI prediction engine
  stop() {
    this.isActive = false;
    logger.info('AI Prediction Engine stopped');
  }

  // Process telemetry data and generate predictions
  processTelemetry(telemetryData, speedData, raceState) {
    if (!this.isActive) return [];

    try {
      const predictions = [];

      telemetryData.cars.forEach(car => {
        const carPredictions = this.generateCarPredictions(car, speedData, raceState);
        predictions.push(...carPredictions);
      });

      // Generate race-level predictions
      const racePredictions = this.generateRacePredictions(telemetryData, raceState);
      predictions.push(...racePredictions);

      // Store predictions
      this.predictionHistory.push(...predictions);

      // Maintain history size
      if (this.predictionHistory.length > this.maxHistorySize) {
        this.predictionHistory = this.predictionHistory.slice(-this.maxHistorySize);
      }

      // Notify listeners
      predictions.forEach(prediction => this.notify(prediction));

      return predictions;

    } catch (error) {
      logger.error('Error generating AI predictions:', error);
      return [];
    }
  }

  // Generate predictions for a specific car
  generateCarPredictions(car, speedData, raceState) {
    const predictions = [];

    // Speed trend prediction
    const speedPrediction = this.predictSpeedTrend(car, speedData);
    if (speedPrediction) predictions.push(speedPrediction);

    // Incident risk prediction
    const incidentPrediction = this.predictIncidentRisk(car, speedData);
    if (incidentPrediction) predictions.push(incidentPrediction);

    // Pit strategy recommendation
    const pitRecommendation = this.recommendPitStrategy(car, raceState);
    if (pitRecommendation) predictions.push(pitRecommendation);

    // Overtake opportunity prediction
    const overtakePrediction = this.predictOvertakeOpportunity(car, raceState);
    if (overtakePrediction) predictions.push(overtakePrediction);

    return predictions;
  }

  // Predict speed trend
  predictSpeedTrend(car, speedData) {
    const carSpeedData = speedData.cars?.find(c => c.carId === car.carId);
    if (!carSpeedData || carSpeedData.history.length < 5) return null;

    const recentSpeeds = carSpeedData.history.slice(-10).map(h => h.speed);
    const trend = this.calculateTrend(recentSpeeds);

    let prediction, confidence, timeHorizon;

    if (Math.abs(trend) < 2) {
      prediction = 'speed_stable';
      confidence = 0.85;
      timeHorizon = 30; // seconds
    } else if (trend > 5) {
      prediction = 'speed_increasing';
      confidence = Math.min(0.9, Math.abs(trend) / 20);
      timeHorizon = 20;
    } else if (trend < -5) {
      prediction = 'speed_decreasing';
      confidence = Math.min(0.9, Math.abs(trend) / 20);
      timeHorizon = 15;
    }

    if (prediction) {
      return {
        type: 'SPEED_PREDICTION',
        carId: car.carId,
        driver: car.driver,
        prediction,
        confidence,
        timeHorizon,
        data: {
          currentSpeed: car.speed,
          trend,
          recentSpeeds
        },
        timestamp: new Date().toISOString(),
        model: 'speed_trend_v1'
      };
    }

    return null;
  }

  // Predict incident risk
  predictIncidentRisk(car, speedData) {
    const carSpeedData = speedData.cars?.find(c => c.carId === car.carId);
    if (!carSpeedData) return null;

    let riskScore = 0;
    const factors = [];

    // Speed variation factor
    const speedVariation = this.calculateVariation(carSpeedData.history.map(h => h.speed));
    if (speedVariation > 15) {
      riskScore += 0.3;
      factors.push('high_speed_variation');
    }

    // Tire temperature factor
    const avgTireTemp = (car.tireTemperatures.frontLeft + car.tireTemperatures.frontRight +
                        car.tireTemperatures.rearLeft + car.tireTemperatures.rearRight) / 4;
    if (avgTireTemp > 120) {
      riskScore += 0.25;
      factors.push('overheated_tires');
    }

    // Engine temperature factor
    if (car.engine.temperature > 115) {
      riskScore += 0.2;
      factors.push('engine_overheat');
    }

    // Brake temperature factor
    if (car.brakes.temperature > 700) {
      riskScore += 0.15;
      factors.push('brake_fade_risk');
    }

    // Low fuel factor
    if (car.fuel.remaining < 15) {
      riskScore += 0.1;
      factors.push('low_fuel');
    }

    if (riskScore > 0.1) {
      const riskLevel = riskScore > 0.5 ? 'HIGH' : riskScore > 0.3 ? 'MEDIUM' : 'LOW';

      return {
        type: 'INCIDENT_PREDICTION',
        carId: car.carId,
        driver: car.driver,
        prediction: 'incident_risk',
        riskLevel,
        riskScore,
        factors,
        timeHorizon: riskLevel === 'HIGH' ? 60 : riskLevel === 'MEDIUM' ? 120 : 300, // seconds
        confidence: Math.min(0.95, riskScore + 0.4),
        data: {
          speedVariation,
          avgTireTemp,
          engineTemp: car.engine.temperature,
          brakeTemp: car.brakes.temperature,
          fuelLevel: car.fuel.remaining
        },
        timestamp: new Date().toISOString(),
        model: 'incident_risk_v1'
      };
    }

    return null;
  }

  // Recommend pit strategy
  recommendPitStrategy(car, raceState) {
    const lapsRemaining = raceState.totalLaps - car.lapNumber;
    const currentTireAge = Math.random() * 20 + 5; // Mock tire age
    const fuelRemaining = car.fuel.remaining;

    let recommendation = null;
    let confidence = 0;
    let reasoning = [];

    // Tire change recommendation
    if (currentTireAge > 15 && lapsRemaining > 5) {
      recommendation = 'pit_for_tires';
      confidence = 0.7;
      reasoning.push('tires_wearing');
    }

    // Fuel strategy
    if (fuelRemaining < 20 && lapsRemaining > 3) {
      if (recommendation) {
        recommendation = 'pit_for_tires_and_fuel';
        confidence = 0.8;
        reasoning.push('low_fuel');
      } else {
        recommendation = 'pit_for_fuel';
        confidence = 0.6;
        reasoning.push('fuel_management');
      }
    }

    if (recommendation) {
      return {
        type: 'PIT_STRATEGY',
        carId: car.carId,
        driver: car.driver,
        prediction: recommendation,
        confidence,
        reasoning,
        optimalLap: car.lapNumber + Math.floor(lapsRemaining * 0.7),
        data: {
          lapsRemaining,
          currentTireAge,
          fuelRemaining,
          currentPosition: car.position
        },
        timestamp: new Date().toISOString(),
        model: 'pit_strategy_v1'
      };
    }

    return null;
  }

  // Predict overtake opportunities
  predictOvertakeOpportunity(car, raceState) {
    const leaderboard = raceState.leaderboard || [];
    const carPosition = leaderboard.findIndex(c => c.carId === car.carId);

    if (carPosition === -1 || carPosition === 0) return null;

    const carAhead = leaderboard[carPosition - 1];
    if (!carAhead) return null;

    // Calculate gap
    const gap = carAhead.gapToLeader - car.gapToLeader;
    const speedDiff = car.speed - carAhead.speed;

    let opportunity = false;
    let confidence = 0;
    let reasoning = [];

    // DRS opportunity (simplified)
    if (gap < 1.0 && speedDiff > 5) {
      opportunity = true;
      confidence = 0.75;
      reasoning.push('drs_range');
    }

    // Slipstream opportunity
    if (gap < 0.5 && Math.random() > 0.7) {
      opportunity = true;
      confidence = 0.6;
      reasoning.push('slipstream_available');
    }

    if (opportunity) {
      return {
        type: 'OVERTAKE_PREDICTION',
        carId: car.carId,
        driver: car.driver,
        prediction: 'overtake_opportunity',
        targetCar: carAhead.carId,
        targetDriver: carAhead.driver,
        confidence,
        reasoning,
        data: {
          currentGap: gap,
          speedDiff,
          currentPosition: car.position,
          targetPosition: carAhead.position
        },
        timestamp: new Date().toISOString(),
        model: 'overtake_v1'
      };
    }

    return null;
  }

  // Generate race-level predictions
  generateRacePredictions(telemetryData, raceState) {
    const predictions = [];

    // Safety car prediction
    const safetyCarPrediction = this.predictSafetyCar(telemetryData);
    if (safetyCarPrediction) predictions.push(safetyCarPrediction);

    // Race finish prediction
    const finishPrediction = this.predictRaceFinish(raceState);
    if (finishPrediction) predictions.push(finishPrediction);

    // Weather impact prediction
    const weatherPrediction = this.predictWeatherImpact(raceState);
    if (weatherPrediction) predictions.push(weatherPrediction);

    return predictions;
  }

  // Predict safety car deployment
  predictSafetyCar(telemetryData) {
    const stoppedCars = telemetryData.cars.filter(car => car.speed < 20).length;
    const slowCars = telemetryData.cars.filter(car => car.speed < 100).length;

    if (stoppedCars >= 2 || slowCars >= 5) {
      return {
        type: 'RACE_PREDICTION',
        prediction: 'safety_car_likely',
        confidence: Math.min(0.9, (stoppedCars * 0.3) + (slowCars * 0.1)),
        timeHorizon: 120, // seconds
        data: {
          stoppedCars,
          slowCars,
          totalCars: telemetryData.cars.length
        },
        timestamp: new Date().toISOString(),
        model: 'safety_car_v1'
      };
    }

    return null;
  }

  // Predict race finish
  predictRaceFinish(raceState) {
    const lapsRemaining = raceState.totalLaps - raceState.currentLap;
    const leader = raceState.leaderboard?.[0];

    if (!leader || lapsRemaining > 5) return null;

    const estimatedTime = lapsRemaining * 90; // 90 seconds per lap average

    return {
      type: 'RACE_PREDICTION',
      prediction: 'race_finish',
      estimatedTime,
      confidence: 0.95,
      data: {
        lapsRemaining,
        leader: leader.driver,
        estimatedFinish: new Date(Date.now() + estimatedTime * 1000).toISOString()
      },
      timestamp: new Date().toISOString(),
      model: 'race_finish_v1'
    };
  }

  // Predict weather impact
  predictWeatherImpact(raceState) {
    // Simplified weather prediction
    const rainProbability = Math.random() * 0.3; // 30% max probability

    if (rainProbability > 0.15) {
      return {
        type: 'RACE_PREDICTION',
        prediction: 'weather_change',
        confidence: rainProbability,
        timeHorizon: 1800, // 30 minutes
        data: {
          condition: 'possible_rain',
          probability: rainProbability,
          impact: rainProbability > 0.25 ? 'high' : 'medium'
        },
        timestamp: new Date().toISOString(),
        model: 'weather_v1'
      };
    }

    return null;
  }

  // Utility functions
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  calculateVariation(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // Get prediction history
  getPredictionHistory(carId = null, limit = 50) {
    let history = this.predictionHistory;

    if (carId) {
      history = history.filter(p => p.carId === carId);
    }

    return history.slice(-limit);
  }

  // Get prediction statistics
  getPredictionStats() {
    const predictions = this.predictionHistory;

    return {
      totalPredictions: predictions.length,
      byType: predictions.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {}),
      averageConfidence: predictions.length > 0 ?
        predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length : 0,
      recentPredictions: predictions.slice(-10)
    };
  }

  // Clear prediction history
  clearHistory() {
    this.predictionHistory = [];
    logger.info('AI prediction history cleared');
  }

  // Create simplified prediction models (placeholders)
  createSpeedPredictionModel() {
    return {
      name: 'speed_trend_v1',
      version: '1.0',
      accuracy: 0.78,
      features: ['speed_history', 'track_position', 'tire_condition']
    };
  }

  createIncidentPredictionModel() {
    return {
      name: 'incident_risk_v1',
      version: '1.0',
      accuracy: 0.82,
      features: ['speed_variation', 'tire_temp', 'engine_temp', 'brake_temp', 'fuel_level']
    };
  }

  createPitStrategyModel() {
    return {
      name: 'pit_strategy_v1',
      version: '1.0',
      accuracy: 0.75,
      features: ['laps_remaining', 'tire_age', 'fuel_level', 'position', 'weather']
    };
  }

  createOvertakePredictionModel() {
    return {
      name: 'overtake_v1',
      version: '1.0',
      accuracy: 0.70,
      features: ['gap_to_car_ahead', 'speed_diff', 'drs_available', 'track_position']
    };
  }
}

export default AIPredictionEngine;