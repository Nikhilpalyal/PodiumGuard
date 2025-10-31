import axios from 'axios';
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

class RaceDataFeed {
  constructor() {
    this.sources = [
      {
        name: 'OpenF1',
        url: 'https://api.openf1.org/v1/live_timing',
        active: true,
        interval: 1000 // 1 second
      },
      {
        name: 'DemoData',
        url: null,
        active: true,
        interval: 1000,
        generateDemoData: true
      }
    ];
    this.listeners = [];
    this.isRunning = false;
  }

  // Subscribe to data updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  notify(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error notifying listener:', error);
      }
    });
  }

  // Generate demo race data
  generateDemoData() {
    const cars = [1, 44, 16, 63, 55, 11, 4, 81, 14, 18, 3, 31, 10, 20, 22, 27, 24, 2, 77, 23];
    const trackLength = 3074; // Monza circuit length in meters

    return cars.map(carId => {
      const baseSpeed = 280 + Math.random() * 80; // 280-360 km/h
      const speed = Math.max(0, baseSpeed + (Math.random() * 20 - 10));

      // GPS position simulation
      const lapProgress = Math.random();
      const position = {
        x: Math.cos(lapProgress * Math.PI * 2) * 1000,
        y: Math.sin(lapProgress * Math.PI * 2) * 1000,
        z: 0
      };

      return {
        carId,
        speed: Math.round(speed),
        position,
        lapNumber: Math.floor(Math.random() * 58) + 1,
        sector: Math.floor(Math.random() * 3) + 1,
        timestamp: new Date().toISOString(),
        driver: this.getDriverName(carId),
        team: this.getTeamName(carId),
        status: Math.random() > 0.95 ? 'PIT' : 'ON_TRACK'
      };
    });
  }

  getDriverName(carId) {
    const drivers = {
      1: 'Max Verstappen',
      44: 'Lewis Hamilton',
      16: 'Charles Leclerc',
      63: 'George Russell',
      55: 'Carlos Sainz',
      11: 'Sergio Perez',
      4: 'Lando Norris',
      81: 'Oscar Piastri',
      14: 'Fernando Alonso',
      18: 'Lance Stroll',
      3: 'Daniel Ricciardo',
      31: 'Esteban Ocon',
      10: 'Pierre Gasly',
      20: 'Kevin Magnussen',
      22: 'Yuki Tsunoda',
      27: 'Nico Hulkenberg',
      24: 'Zhou Guanyu',
      2: 'Logan Sargeant',
      77: 'Valtteri Bottas',
      23: 'Alexander Albon'
    };
    return drivers[carId] || `Driver ${carId}`;
  }

  getTeamName(carId) {
    const teams = {
      1: 'Red Bull Racing',
      44: 'Mercedes',
      16: 'Ferrari',
      63: 'Mercedes',
      55: 'Ferrari',
      11: 'Red Bull Racing',
      4: 'McLaren',
      81: 'McLaren',
      14: 'Aston Martin',
      18: 'Aston Martin',
      3: 'AlphaTauri',
      31: 'Alpine',
      10: 'Alpine',
      20: 'Haas',
      22: 'AlphaTauri',
      27: 'Haas',
      24: 'Alfa Romeo',
      2: 'Williams',
      77: 'Alfa Romeo',
      23: 'Williams'
    };
    return teams[carId] || 'Unknown Team';
  }

  // Fetch data from OpenF1 API
  async fetchOpenF1Data() {
    try {
      const response = await axios.get('https://api.openf1.org/v1/live_timing', {
        timeout: 5000
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map(item => ({
          carId: item.car_number || item.driver_number,
          speed: item.speed || Math.round(280 + Math.random() * 80),
          position: item.position || {
            x: Math.cos(Math.random() * Math.PI * 2) * 1000,
            y: Math.sin(Math.random() * Math.PI * 2) * 1000,
            z: 0
          },
          lapNumber: item.lap_number || 1,
          sector: item.sector || 1,
          timestamp: item.date || new Date().toISOString(),
          driver: item.driver_name || this.getDriverName(item.car_number),
          team: item.team_name || this.getTeamName(item.car_number),
          status: item.status || 'ON_TRACK'
        }));
      }
    } catch (error) {
      logger.warn('Failed to fetch OpenF1 data, using demo data:', error.message);
    }
    return null;
  }

  // Start data collection
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting Race Data Feed...');

    // Start polling for each source
    this.sources.forEach(source => {
      if (source.active) {
        this.startPolling(source);
      }
    });
  }

  // Stop data collection
  stop() {
    this.isRunning = false;
    logger.info('Stopping Race Data Feed...');
  }

  // Poll a specific data source
  async startPolling(source) {
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        let data;

        if (source.generateDemoData) {
          data = this.generateDemoData();
        } else {
          data = await this.fetchOpenF1Data();
        }

        if (data) {
          this.notify({
            source: source.name,
            timestamp: new Date().toISOString(),
            cars: data
          });
        }
      } catch (error) {
        logger.error(`Error polling ${source.name}:`, error);
      }

      // Schedule next poll
      if (this.isRunning) {
        setTimeout(poll, source.interval);
      }
    };

    // Start polling
    poll();
  }
}

export default RaceDataFeed;