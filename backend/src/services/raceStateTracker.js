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

class RaceStateTracker {
  constructor() {
    this.raceState = {
      session: 'RACE', // PRACTICE, QUALIFYING, RACE
      totalLaps: 58,
      currentLap: 1,
      cars: new Map(), // carId -> car state
      leaderboard: [],
      pitStops: new Map(), // carId -> pit stop history
      fastestLap: {
        time: Infinity,
        carId: null,
        driver: null,
        lap: 0
      },
      safetyCar: false,
      redFlag: false,
      chequeredFlag: false,
      weather: 'DRY',
      trackTemp: 35,
      airTemp: 25
    };
    this.listeners = [];
    this.lapStartTimes = new Map();
  }

  // Subscribe to race state updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of state changes
  notify(update) {
    this.listeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        logger.error('Error notifying race state listener:', error);
      }
    });
  }

  // Update race state with telemetry data
  updateState(telemetryData) {
    try {
      const updates = [];

      telemetryData.cars.forEach(car => {
        const carUpdate = this.updateCarState(car, telemetryData.timestamp);
        if (carUpdate) updates.push(carUpdate);
      });

      // Update leaderboard
      this.updateLeaderboard();

      // Check for race events
      const raceEvents = this.checkRaceEvents(telemetryData);
      updates.push(...raceEvents);

      // Notify listeners
      if (updates.length > 0) {
        this.notify({
          type: 'RACE_STATE_UPDATE',
          timestamp: telemetryData.timestamp,
          updates,
          fullState: this.getCurrentState()
        });
      }

      return updates;

    } catch (error) {
      logger.error('Error updating race state:', error);
      return [];
    }
  }

  // Update individual car state
  updateCarState(car, timestamp) {
    const carId = car.carId;

    // Initialize car state if new
    if (!this.raceState.cars.has(carId)) {
      this.raceState.cars.set(carId, {
        carId,
        driver: car.driver,
        team: car.team,
        position: 0,
        lapNumber: car.lapNumber || 1,
        sector: car.sector || 1,
        status: car.status || 'ON_TRACK',
        pitStops: 0,
        totalPitTime: 0,
        bestLapTime: Infinity,
        lastLapTime: 0,
        gapToLeader: 0,
        interval: 0,
        tyreCompound: 'SOFT',
        fuelLevel: 100,
        lastUpdate: timestamp
      });
    }

    const carState = this.raceState.cars.get(carId);
    const previousState = { ...carState };

    // Update basic info
    carState.lapNumber = car.lapNumber;
    carState.sector = car.sector;
    carState.status = car.status;
    carState.lastUpdate = timestamp;

    // Detect lap completion
    if (carState.lapNumber > previousState.lapNumber) {
      this.handleLapCompletion(carState, timestamp);
    }

    // Detect pit stops
    if (carState.status === 'PIT' && previousState.status !== 'PIT') {
      this.handlePitEntry(carState, timestamp);
    } else if (carState.status !== 'PIT' && previousState.status === 'PIT') {
      this.handlePitExit(carState, timestamp);
    }

    // Check for changes
    const hasChanged = JSON.stringify(carState) !== JSON.stringify(previousState);

    return hasChanged ? {
      type: 'CAR_UPDATE',
      carId,
      changes: this.getStateChanges(previousState, carState),
      newState: carState
    } : null;
  }

  // Handle lap completion
  handleLapCompletion(carState, timestamp) {
    const lapStartTime = this.lapStartTimes.get(carState.carId);
    if (lapStartTime) {
      const lapTime = (new Date(timestamp).getTime() - lapStartTime) / 1000; // seconds
      carState.lastLapTime = lapTime;

      // Update best lap time
      if (lapTime < carState.bestLapTime) {
        carState.bestLapTime = lapTime;
      }

      // Check for fastest lap
      if (lapTime < this.raceState.fastestLap.time) {
        this.raceState.fastestLap = {
          time: lapTime,
          carId: carState.carId,
          driver: carState.driver,
          lap: carState.lapNumber
        };
      }

      logger.info(`Lap ${carState.lapNumber} completed by ${carState.driver}: ${lapTime.toFixed(3)}s`);
    }

    // Start new lap timer
    this.lapStartTimes.set(carState.carId, new Date(timestamp).getTime());
  }

  // Handle pit entry
  handlePitEntry(carState, timestamp) {
    carState.pitStops++;
    logger.info(`${carState.driver} entered pits (stop #${carState.pitStops})`);
  }

  // Handle pit exit
  handlePitExit(carState, timestamp) {
    logger.info(`${carState.driver} exited pits`);
  }

  // Update leaderboard
  updateLeaderboard() {
    const cars = Array.from(this.raceState.cars.values())
      .filter(car => car.status === 'ON_TRACK')
      .sort((a, b) => {
        // Sort by lap (descending), then sector (descending)
        if (a.lapNumber !== b.lapNumber) {
          return b.lapNumber - a.lapNumber;
        }
        return b.sector - a.sector;
      });

    // Assign positions and calculate gaps
    cars.forEach((car, index) => {
      car.position = index + 1;

      if (index === 0) {
        car.gapToLeader = 0;
        car.interval = 0;
      } else {
        // Simplified gap calculation (would need more sophisticated timing in real system)
        car.gapToLeader = (cars[0].lapNumber - car.lapNumber) * 90 + (cars[0].sector - car.sector) * 25;
        car.interval = car.gapToLeader - cars[index - 1].gapToLeader;
      }
    });

    this.raceState.leaderboard = cars;
  }

  // Check for race events
  checkRaceEvents(telemetryData) {
    const events = [];

    // Check for race completion
    const completedCars = Array.from(this.raceState.cars.values())
      .filter(car => car.lapNumber >= this.raceState.totalLaps);

    if (completedCars.length > 0 && !this.raceState.chequeredFlag) {
      this.raceState.chequeredFlag = true;
      events.push({
        type: 'RACE_FINISHED',
        message: 'Chequered flag deployed!',
        winners: completedCars.slice(0, 3),
        timestamp: telemetryData.timestamp
      });
    }

    // Check for safety car deployment (simplified)
    const stoppedCars = telemetryData.cars.filter(car => car.speed < 50).length;
    if (stoppedCars >= 3 && !this.raceState.safetyCar) {
      this.raceState.safetyCar = true;
      events.push({
        type: 'SAFETY_CAR',
        message: 'Safety Car deployed',
        reason: 'Multiple cars stopped on track',
        timestamp: telemetryData.timestamp
      });
    }

    return events;
  }

  // Get state changes between two states
  getStateChanges(oldState, newState) {
    const changes = {};

    Object.keys(newState).forEach(key => {
      if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changes[key] = {
          from: oldState[key],
          to: newState[key]
        };
      }
    });

    return changes;
  }

  // Get current race state
  getCurrentState() {
    return {
      session: this.raceState.session,
      totalLaps: this.raceState.totalLaps,
      currentLap: this.raceState.currentLap,
      leaderboard: this.raceState.leaderboard,
      fastestLap: this.raceState.fastestLap,
      safetyCar: this.raceState.safetyCar,
      redFlag: this.raceState.redFlag,
      chequeredFlag: this.raceState.chequeredFlag,
      weather: this.raceState.weather,
      trackTemp: this.raceState.trackTemp,
      airTemp: this.raceState.airTemp,
      cars: Array.from(this.raceState.cars.values()),
      timestamp: new Date().toISOString()
    };
  }

  // Get car state by ID
  getCarState(carId) {
    return this.raceState.cars.get(carId) || null;
  }

  // Get leaderboard
  getLeaderboard() {
    return this.raceState.leaderboard;
  }

  // Get race statistics
  getRaceStats() {
    const cars = Array.from(this.raceState.cars.values());
    const activeCars = cars.filter(car => car.status === 'ON_TRACK');
    const pittedCars = cars.filter(car => car.status === 'PIT');

    return {
      totalCars: cars.length,
      activeCars: activeCars.length,
      pittedCars: pittedCars.length,
      completedLaps: Math.max(...cars.map(car => car.lapNumber)),
      totalPitStops: cars.reduce((sum, car) => sum + car.pitStops, 0),
      fastestLap: this.raceState.fastestLap,
      session: this.raceState.session,
      weather: this.raceState.weather
    };
  }

  // Reset race state
  resetRace() {
    this.raceState = {
      session: 'RACE',
      totalLaps: 58,
      currentLap: 1,
      cars: new Map(),
      leaderboard: [],
      pitStops: new Map(),
      fastestLap: {
        time: Infinity,
        carId: null,
        driver: null,
        lap: 0
      },
      safetyCar: false,
      redFlag: false,
      chequeredFlag: false,
      weather: 'DRY',
      trackTemp: 35,
      airTemp: 25
    };
    this.lapStartTimes.clear();

    logger.info('Race state reset');
  }

  // Set race conditions
  setRaceConditions(conditions) {
    if (conditions.weather) this.raceState.weather = conditions.weather;
    if (conditions.trackTemp) this.raceState.trackTemp = conditions.trackTemp;
    if (conditions.airTemp) this.raceState.airTemp = conditions.airTemp;
    if (conditions.totalLaps) this.raceState.totalLaps = conditions.totalLaps;

    this.notify({
      type: 'CONDITIONS_UPDATE',
      conditions: this.raceState,
      timestamp: new Date().toISOString()
    });
  }
}

export default RaceStateTracker;