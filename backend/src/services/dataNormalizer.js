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

class DataNormalizer {
  constructor() {
    this.standardSchema = {
      carId: 'number',
      driver: 'string',
      team: 'string',
      speed: 'number', // km/h
      position: {
        x: 'number',
        y: 'number',
        z: 'number'
      },
      lapNumber: 'number',
      sector: 'number',
      status: 'string',
      timestamp: 'string',
      tireTemperatures: {
        frontLeft: 'number',
        frontRight: 'number',
        rearLeft: 'number',
        rearRight: 'number'
      },
      engine: {
        rpm: 'number',
        temperature: 'number',
        oilPressure: 'number',
        fuelPressure: 'number'
      },
      aerodynamics: {
        downforce: 'number',
        drag: 'number'
      },
      suspension: {
        frontLeft: 'number',
        frontRight: 'number',
        rearLeft: 'number',
        rearRight: 'number'
      },
      brakes: {
        frontLeft: 'number',
        frontRight: 'number',
        rearLeft: 'number',
        rearRight: 'number',
        temperature: 'number'
      },
      fuel: {
        remaining: 'number',
        consumption: 'number',
        mixture: 'string'
      }
    };
  }

  // Normalize incoming data to standard format
  normalize(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this.normalizeSingle(item));
      } else {
        return this.normalizeSingle(data);
      }
    } catch (error) {
      logger.error('Error normalizing data:', error);
      return null;
    }
  }

  // Normalize a single data item
  normalizeSingle(rawData) {
    const normalized = {};

    // Basic car information
    normalized.carId = this.normalizeCarId(rawData.carId || rawData.car_number || rawData.driver_number);
    normalized.driver = this.normalizeString(rawData.driver || rawData.driver_name || `Driver ${normalized.carId}`);
    normalized.team = this.normalizeString(rawData.team || rawData.team_name || 'Unknown Team');

    // Speed (ensure in km/h)
    normalized.speed = this.normalizeSpeed(rawData.speed || rawData.speed_kmh || 0);

    // Position
    normalized.position = this.normalizePosition(rawData.position || rawData.gps || { x: 0, y: 0, z: 0 });

    // Race progress
    normalized.lapNumber = this.normalizeNumber(rawData.lapNumber || rawData.lap_number || 1);
    normalized.sector = this.normalizeNumber(rawData.sector || 1);

    // Status
    normalized.status = this.normalizeStatus(rawData.status || 'ON_TRACK');

    // Timestamp
    normalized.timestamp = this.normalizeTimestamp(rawData.timestamp || rawData.date || new Date().toISOString());

    // Tire temperatures
    normalized.tireTemperatures = this.normalizeTireTemperatures(rawData.tireTemperatures || rawData.tires);

    // Engine data
    normalized.engine = this.normalizeEngineData(rawData.engine);

    // Aerodynamics
    normalized.aerodynamics = this.normalizeAerodynamics(rawData.aerodynamics);

    // Suspension
    normalized.suspension = this.normalizeSuspension(rawData.suspension);

    // Brakes
    normalized.brakes = this.normalizeBrakes(rawData.brakes);

    // Fuel
    normalized.fuel = this.normalizeFuel(rawData.fuel);

    return normalized;
  }

  // Normalize car ID to number
  normalizeCarId(value) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
  }

  // Normalize string values
  normalizeString(value) {
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value || '').trim();
  }

  // Normalize speed to km/h
  normalizeSpeed(value) {
    const speed = parseFloat(value);
    if (isNaN(speed)) return 0;

    // If speed seems to be in mph, convert to km/h
    if (speed > 200 && speed < 400) {
      // Likely mph, convert to km/h
      return Math.round(speed * 1.60934);
    }

    return Math.round(speed);
  }

  // Normalize position coordinates
  normalizePosition(position) {
    if (!position) {
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: parseFloat(position.x) || 0,
      y: parseFloat(position.y) || 0,
      z: parseFloat(position.z) || 0
    };
  }

  // Normalize numeric values
  normalizeNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  // Normalize car status
  normalizeStatus(status) {
    const validStatuses = ['ON_TRACK', 'PIT', 'OUT', 'DNF', 'DNS'];
    const normalized = String(status || '').toUpperCase().replace(/\s+/g, '_');

    return validStatuses.includes(normalized) ? normalized : 'ON_TRACK';
  }

  // Normalize timestamp to ISO string
  normalizeTimestamp(timestamp) {
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return new Date().toISOString();
  }

  // Normalize tire temperatures
  normalizeTireTemperatures(tires) {
    if (!tires) {
      return {
        frontLeft: 85,
        frontRight: 85,
        rearLeft: 90,
        rearRight: 90
      };
    }

    return {
      frontLeft: this.normalizeNumber(tires.frontLeft || tires.FL || 85),
      frontRight: this.normalizeNumber(tires.frontRight || tires.FR || 85),
      rearLeft: this.normalizeNumber(tires.rearLeft || tires.RL || 90),
      rearRight: this.normalizeNumber(tires.rearRight || tires.RR || 90)
    };
  }

  // Normalize engine data
  normalizeEngineData(engine) {
    if (!engine) {
      return {
        rpm: 12000,
        temperature: 100,
        oilPressure: 4.0,
        fuelPressure: 4.5
      };
    }

    return {
      rpm: this.normalizeNumber(engine.rpm || 12000),
      temperature: this.normalizeNumber(engine.temperature || 100),
      oilPressure: this.normalizeNumber(engine.oilPressure || 4.0),
      fuelPressure: this.normalizeNumber(engine.fuelPressure || 4.5)
    };
  }

  // Normalize aerodynamics data
  normalizeAerodynamics(aero) {
    if (!aero) {
      return {
        downforce: 4000,
        drag: 1500
      };
    }

    return {
      downforce: this.normalizeNumber(aero.downforce || 4000),
      drag: this.normalizeNumber(aero.drag || 1500)
    };
  }

  // Normalize suspension data
  normalizeSuspension(suspension) {
    if (!suspension) {
      return {
        frontLeft: 0,
        frontRight: 0,
        rearLeft: 0,
        rearRight: 0
      };
    }

    return {
      frontLeft: this.normalizeNumber(suspension.frontLeft || suspension.FL || 0),
      frontRight: this.normalizeNumber(suspension.frontRight || suspension.FR || 0),
      rearLeft: this.normalizeNumber(suspension.rearLeft || suspension.RL || 0),
      rearRight: this.normalizeNumber(suspension.rearRight || suspension.RR || 0)
    };
  }

  // Normalize brake data
  normalizeBrakes(brakes) {
    if (!brakes) {
      return {
        frontLeft: 0,
        frontRight: 0,
        rearLeft: 0,
        rearRight: 0,
        temperature: 400
      };
    }

    return {
      frontLeft: this.normalizeNumber(brakes.frontLeft || brakes.FL || 0),
      frontRight: this.normalizeNumber(brakes.frontRight || brakes.FR || 0),
      rearLeft: this.normalizeNumber(brakes.rearLeft || brakes.RL || 0),
      rearRight: this.normalizeNumber(brakes.rearRight || brakes.RR || 0),
      temperature: this.normalizeNumber(brakes.temperature || 400)
    };
  }

  // Normalize fuel data
  normalizeFuel(fuel) {
    if (!fuel) {
      return {
        remaining: 100,
        consumption: 3.0,
        mixture: 'optimal'
      };
    }

    return {
      remaining: this.normalizeNumber(fuel.remaining || 100),
      consumption: this.normalizeNumber(fuel.consumption || 3.0),
      mixture: this.normalizeString(fuel.mixture || 'optimal')
    };
  }

  // Validate normalized data against schema
  validate(data) {
    // Basic validation - check required fields
    const requiredFields = ['carId', 'driver', 'team', 'speed', 'position', 'timestamp'];

    for (const field of requiredFields) {
      if (!data[field]) {
        logger.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  // Get schema for reference
  getSchema() {
    return this.standardSchema;
  }
}

export default DataNormalizer;