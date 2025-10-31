class RaceStateStore {
  constructor() {
    this.state = {
      // Race session info
      session: {
        type: 'RACE',
        circuit: 'Monza',
        totalLaps: 58,
        currentLap: 1,
        status: 'ACTIVE',
        weather: 'DRY',
        airTemp: 25,
        trackTemp: 35
      },

      // Cars data
      cars: new Map(),

      // Leaderboard
      leaderboard: [],

      // Race events and alerts
      alerts: [],
      events: [],

      // Analytics data
      analytics: {
        speedStats: {},
        performanceGroups: {},
        sectorPerformance: {}
      },

      // UI state
      ui: {
        selectedCarId: null,
        viewMode: 'dashboard',
        filters: {
          carFilter: 'all',
          alertFilter: 'all',
          timeRange: 3600000 // 1 hour
        }
      },

      // Connection status
      connection: {
        isConnected: false,
        latency: 0,
        lastUpdate: null
      }
    };

    this.listeners = new Map();
    this.history = [];
    this.maxHistorySize = 100;
  }

  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Get state value at path
  get(path) {
    return this.getNestedValue(this.state, path);
  }

  // Set state value at path
  set(path, value) {
    const oldValue = this.get(path);
    this.setNestedValue(this.state, path, value);

    // Save to history
    this.saveToHistory(path, oldValue, value);

    // Notify listeners
    this.notifyListeners(path, value, oldValue);

    return value;
  }

  // Update state with partial data
  update(updates) {
    Object.keys(updates).forEach(path => {
      this.set(path, updates[path]);
    });
  }

  // Get entire state
  getState() {
    return { ...this.state };
  }

  // Reset state
  reset() {
    this.state = {
      session: {
        type: 'RACE',
        circuit: 'Monza',
        totalLaps: 58,
        currentLap: 1,
        status: 'ACTIVE',
        weather: 'DRY',
        airTemp: 25,
        trackTemp: 35
      },
      cars: new Map(),
      leaderboard: [],
      alerts: [],
      events: [],
      analytics: {
        speedStats: {},
        performanceGroups: {},
        sectorPerformance: {}
      },
      ui: {
        selectedCarId: null,
        viewMode: 'dashboard',
        filters: {
          carFilter: 'all',
          alertFilter: 'all',
          timeRange: 3600000
        }
      },
      connection: {
        isConnected: false,
        latency: 0,
        lastUpdate: null
      }
    };

    this.history = [];
    this.notifyAllListeners();
  }

  // Get nested value from object
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object') {
        if (key === 'cars' && current instanceof Map) {
          return Array.from(current.values());
        }
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  // Set nested value in object
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  // Notify listeners of path changes
  notifyListeners(path, newValue, oldValue) {
    // Notify exact path listeners
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach(callback => {
        callback(newValue, oldValue, path);
      });
    }

    // Notify parent path listeners
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.listeners.has(parentPath)) {
        this.listeners.get(parentPath).forEach(callback => {
          callback(this.get(parentPath), undefined, parentPath);
        });
      }
    }

    // Notify wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        callback(newValue, oldValue, path);
      });
    }
  }

  // Notify all listeners
  notifyAllListeners() {
    this.listeners.forEach((callbacks, path) => {
      const value = this.get(path);
      callbacks.forEach(callback => {
        callback(value, undefined, path);
      });
    });
  }

  // Save state change to history
  saveToHistory(path, oldValue, newValue) {
    this.history.push({
      timestamp: Date.now(),
      path,
      oldValue,
      newValue
    });

    // Maintain history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Get state history
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  // Undo last change
  undo() {
    if (this.history.length === 0) return false;

    const lastChange = this.history.pop();
    this.set(lastChange.path, lastChange.oldValue);

    return true;
  }

  // Race-specific methods
  updateCarData(carId, carData) {
    const cars = this.state.cars;
    cars.set(carId, { ...cars.get(carId), ...carData, lastUpdate: Date.now() });
    this.set('cars', cars);
  }

  removeCar(carId) {
    const cars = this.state.cars;
    cars.delete(carId);
    this.set('cars', cars);
  }

  updateLeaderboard(leaderboard) {
    this.set('leaderboard', leaderboard);
  }

  addAlert(alert) {
    const alerts = [...this.state.alerts];
    alerts.unshift({ ...alert, id: Date.now() }); // Add to beginning

    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.splice(100);
    }

    this.set('alerts', alerts);
  }

  clearAlerts() {
    this.set('alerts', []);
  }

  addEvent(event) {
    const events = [...this.state.events];
    events.unshift({ ...event, id: Date.now() });

    // Keep only last 200 events
    if (events.length > 200) {
      events.splice(200);
    }

    this.set('events', events);
  }

  updateAnalytics(analytics) {
    this.set('analytics', { ...this.state.analytics, ...analytics });
  }

  setSelectedCar(carId) {
    this.set('ui.selectedCarId', carId);
  }

  setViewMode(mode) {
    this.set('ui.viewMode', mode);
  }

  updateFilters(filters) {
    this.set('ui.filters', { ...this.state.ui.filters, ...filters });
  }

  updateConnectionStatus(status) {
    this.set('connection', { ...this.state.connection, ...status, lastUpdate: Date.now() });
  }

  // Get filtered data
  getFilteredCars() {
    const cars = Array.from(this.state.cars.values());
    const filter = this.state.ui.filters.carFilter;

    if (filter === 'all') return cars;
    if (filter === 'active') return cars.filter(car => car.status === 'ON_TRACK');
    if (filter === 'pit') return cars.filter(car => car.status === 'PIT');

    return cars;
  }

  getFilteredAlerts() {
    const alerts = this.state.alerts;
    const filter = this.state.ui.filters.alertFilter;

    if (filter === 'all') return alerts;
    return alerts.filter(alert => alert.severity?.toLowerCase() === filter);
  }

  // Get car by ID
  getCar(carId) {
    return this.state.cars.get(carId);
  }

  // Get selected car
  getSelectedCar() {
    return this.state.ui.selectedCarId ? this.getCar(this.state.ui.selectedCarId) : null;
  }

  // Export state
  export() {
    return {
      state: this.getState(),
      history: this.history,
      exportTime: Date.now()
    };
  }

  // Import state
  import(data) {
    if (data.state) {
      this.state = data.state;
      this.history = data.history || [];
      this.notifyAllListeners();
    }
  }

  // Get statistics
  getStats() {
    const cars = Array.from(this.state.cars.values());

    return {
      totalCars: cars.length,
      activeCars: cars.filter(car => car.status === 'ON_TRACK').length,
      pittedCars: cars.filter(car => car.status === 'PIT').length,
      totalAlerts: this.state.alerts.length,
      criticalAlerts: this.state.alerts.filter(a => a.severity === 'CRITICAL').length,
      totalEvents: this.state.events.length,
      historySize: this.history.length,
      listenersCount: Array.from(this.listeners.values()).reduce((sum, callbacks) => sum + callbacks.length, 0)
    };
  }
}

// Create singleton instance
const raceStateStore = new RaceStateStore();

export default raceStateStore;