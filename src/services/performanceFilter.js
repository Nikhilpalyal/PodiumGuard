class PerformanceFilter {
  constructor() {
    this.filters = {
      // Speed filters
      minSpeed: 0,
      maxSpeed: 400,
      speedRange: null, // [min, max]

      // Performance status filters
      performanceStatus: [], // ['exceptional', 'strong', 'steady', 'struggling', 'critical']

      // Tire temperature filters
      tireTempRange: null, // [min, max]
      tireTempAnomaly: false, // Show cars with tire temp anomalies

      // Engine filters
      engineTempRange: null, // [min, max]
      oilPressureRange: null, // [min, max]
      fuelLevelRange: null, // [min, max]

      // Status filters
      carStatus: [], // ['ON_TRACK', 'PIT', 'DNF', 'DNS']

      // Team filters
      teams: [], // Team names to include

      // Car number filters
      carNumbers: [], // Specific car numbers to include

      // Time-based filters
      timeRange: null, // [startTime, endTime]
      lapRange: null, // [minLap, maxLap]

      // Alert filters
      hasAlerts: null, // true, false, or null for all
      alertSeverity: [], // ['CRITICAL', 'WARNING', 'INFO']
    };

    this.listeners = [];
  }

  // Subscribe to filter changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners of filter changes
  notify() {
    this.listeners.forEach(callback => {
      callback(this.filters);
    });
  }

  // Set filter value
  setFilter(key, value) {
    if (this.filters.hasOwnProperty(key)) {
      this.filters[key] = value;
      this.notify();
      return true;
    }
    return false;
  }

  // Get filter value
  getFilter(key) {
    return this.filters[key];
  }

  // Get all filters
  getAllFilters() {
    return { ...this.filters };
  }

  // Reset all filters
  resetFilters() {
    this.filters = {
      minSpeed: 0,
      maxSpeed: 400,
      speedRange: null,
      performanceStatus: [],
      tireTempRange: null,
      tireTempAnomaly: false,
      engineTempRange: null,
      oilPressureRange: null,
      fuelLevelRange: null,
      carStatus: [],
      teams: [],
      carNumbers: [],
      timeRange: null,
      lapRange: null,
      hasAlerts: null,
      alertSeverity: []
    };
    this.notify();
  }

  // Apply filters to car data
  applyFilters(cars, alerts = []) {
    if (!Array.isArray(cars)) return [];

    return cars.filter(car => this.matchesFilters(car, alerts));
  }

  // Check if car matches current filters
  matchesFilters(car, alerts = []) {
    // Speed filters
    if (this.filters.speedRange) {
      const [min, max] = this.filters.speedRange;
      if (car.speed < min || car.speed > max) return false;
    } else {
      if (car.speed < this.filters.minSpeed || car.speed > this.filters.maxSpeed) return false;
    }

    // Performance status filters
    if (this.filters.performanceStatus.length > 0) {
      const performance = this.getCarPerformanceStatus(car);
      if (!this.filters.performanceStatus.includes(performance)) return false;
    }

    // Tire temperature filters
    if (this.filters.tireTempRange) {
      const [min, max] = this.filters.tireTempRange;
      const avgTireTemp = this.getAverageTireTemp(car);
      if (avgTireTemp < min || avgTireTemp > max) return false;
    }

    if (this.filters.tireTempAnomaly) {
      if (!this.hasTireTempAnomaly(car)) return false;
    }

    // Engine filters
    if (this.filters.engineTempRange) {
      const [min, max] = this.filters.engineTempRange;
      if (car.engine?.temperature < min || car.engine?.temperature > max) return false;
    }

    if (this.filters.oilPressureRange) {
      const [min, max] = this.filters.oilPressureRange;
      if (car.engine?.oilPressure < min || car.engine?.oilPressure > max) return false;
    }

    if (this.filters.fuelLevelRange) {
      const [min, max] = this.filters.fuelLevelRange;
      if (car.fuel?.remaining < min || car.fuel?.remaining > max) return false;
    }

    // Status filters
    if (this.filters.carStatus.length > 0) {
      if (!this.filters.carStatus.includes(car.status)) return false;
    }

    // Team filters
    if (this.filters.teams.length > 0) {
      if (!this.filters.teams.includes(car.team)) return false;
    }

    // Car number filters
    if (this.filters.carNumbers.length > 0) {
      if (!this.filters.carNumbers.includes(car.carId)) return false;
    }

    // Lap range filters
    if (this.filters.lapRange) {
      const [min, max] = this.filters.lapRange;
      if (car.lapNumber < min || car.lapNumber > max) return false;
    }

    // Alert filters
    if (this.filters.hasAlerts !== null) {
      const carAlerts = alerts.filter(alert => alert.carId === car.carId);
      const hasAlerts = carAlerts.length > 0;

      if (this.filters.hasAlerts !== hasAlerts) return false;
    }

    if (this.filters.alertSeverity.length > 0) {
      const carAlerts = alerts.filter(alert => alert.carId === car.carId);
      const hasMatchingSeverity = carAlerts.some(alert =>
        this.filters.alertSeverity.includes(alert.severity)
      );

      if (!hasMatchingSeverity) return false;
    }

    return true;
  }

  // Get car performance status
  getCarPerformanceStatus(car) {
    const speed = car.speed || 0;

    if (speed >= 320) return 'exceptional';
    if (speed >= 300) return 'strong';
    if (speed >= 280) return 'steady';
    if (speed >= 250) return 'struggling';
    return 'critical';
  }

  // Get average tire temperature
  getAverageTireTemp(car) {
    if (!car.tireTemperatures) return 0;

    const temps = [
      car.tireTemperatures.frontLeft,
      car.tireTemperatures.frontRight,
      car.tireTemperatures.rearLeft,
      car.tireTemperatures.rearRight
    ].filter(temp => temp !== undefined);

    if (temps.length === 0) return 0;

    return temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
  }

  // Check for tire temperature anomalies
  hasTireTempAnomaly(car) {
    if (!car.tireTemperatures) return false;

    const temps = [
      car.tireTemperatures.frontLeft,
      car.tireTemperatures.frontRight,
      car.tireTemperatures.rearLeft,
      car.tireTemperatures.rearRight
    ].filter(temp => temp !== undefined);

    if (temps.length < 4) return false;

    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const diff = maxTemp - minTemp;

    // Consider it an anomaly if temperature difference is > 15°C
    return diff > 15;
  }

  // Set speed range filter
  setSpeedRange(min, max) {
    this.setFilter('speedRange', [min, max]);
  }

  // Clear speed range filter
  clearSpeedRange() {
    this.setFilter('speedRange', null);
  }

  // Set performance status filter
  setPerformanceStatus(statuses) {
    this.setFilter('performanceStatus', Array.isArray(statuses) ? statuses : [statuses]);
  }

  // Add performance status
  addPerformanceStatus(status) {
    const current = this.filters.performanceStatus;
    if (!current.includes(status)) {
      this.setFilter('performanceStatus', [...current, status]);
    }
  }

  // Remove performance status
  removePerformanceStatus(status) {
    const current = this.filters.performanceStatus;
    this.setFilter('performanceStatus', current.filter(s => s !== status));
  }

  // Set tire temperature range
  setTireTempRange(min, max) {
    this.setFilter('tireTempRange', [min, max]);
  }

  // Set engine temperature range
  setEngineTempRange(min, max) {
    this.setFilter('engineTempRange', [min, max]);
  }

  // Set fuel level range
  setFuelLevelRange(min, max) {
    this.setFilter('fuelLevelRange', [min, max]);
  }

  // Set car status filter
  setCarStatus(statuses) {
    this.setFilter('carStatus', Array.isArray(statuses) ? statuses : [statuses]);
  }

  // Set team filter
  setTeams(teams) {
    this.setFilter('teams', Array.isArray(teams) ? teams : [teams]);
  }

  // Set car numbers filter
  setCarNumbers(numbers) {
    this.setFilter('carNumbers', Array.isArray(numbers) ? numbers : [numbers]);
  }

  // Set lap range
  setLapRange(min, max) {
    this.setFilter('lapRange', [min, max]);
  }

  // Set alert filters
  setAlertFilters(hasAlerts, severities = []) {
    this.setFilter('hasAlerts', hasAlerts);
    this.setFilter('alertSeverity', Array.isArray(severities) ? severities : [severities]);
  }

  // Get filter summary
  getFilterSummary() {
    const activeFilters = {};

    Object.entries(this.filters).forEach(([key, value]) => {
      if (this.isFilterActive(key, value)) {
        activeFilters[key] = value;
      }
    });

    return {
      activeFilters,
      totalActive: Object.keys(activeFilters).length,
      isFiltering: Object.keys(activeFilters).length > 0
    };
  }

  // Check if a filter is active
  isFilterActive(key, value) {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (key.includes('Range') && value !== null) {
      return true;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number' && value !== 0) {
      return true;
    }

    return value !== null;
  }

  // Get filter presets
  getFilterPresets() {
    return {
      all: () => this.resetFilters(),
      fastCars: () => {
        this.resetFilters();
        this.setSpeedRange(300, 400);
      },
      struggling: () => {
        this.resetFilters();
        this.setPerformanceStatus(['struggling', 'critical']);
      },
      pitStop: () => {
        this.resetFilters();
        this.setCarStatus(['PIT']);
      },
      overheating: () => {
        this.resetFilters();
        this.setEngineTempRange(110, 150);
      },
      lowFuel: () => {
        this.resetFilters();
        this.setFuelLevelRange(0, 20);
      },
      redBull: () => {
        this.resetFilters();
        this.setTeams(['Red Bull Racing']);
      },
      mercedes: () => {
        this.resetFilters();
        this.setTeams(['Mercedes']);
      },
      ferrari: () => {
        this.resetFilters();
        this.setTeams(['Ferrari']);
      }
    };
  }

  // Apply preset filter
  applyPreset(presetName) {
    const presets = this.getFilterPresets();
    if (presets[presetName]) {
      presets[presetName]();
    }
  }

  // Export filters
  exportFilters() {
    return {
      filters: this.getAllFilters(),
      summary: this.getFilterSummary(),
      exportTime: Date.now()
    };
  }

  // Import filters
  importFilters(data) {
    if (data.filters) {
      this.filters = { ...this.filters, ...data.filters };
      this.notify();
    }
  }
}

// Create singleton instance
const performanceFilter = new PerformanceFilter();

export default performanceFilter;