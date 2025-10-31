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

class MetadataStore {
  constructor(dataDir = './data/metadata') {
    this.dataDir = dataDir;
    this.metadata = new Map();
    this.persistenceInterval = 10 * 60 * 1000; // 10 minutes

    this.ensureDataDirectory();
    this.loadPersistedMetadata();
    this.startPersistenceTimer();
    this.initializeDefaultMetadata();
  }

  // Ensure data directory exists
  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info(`Created metadata directory: ${this.dataDir}`);
      }
    } catch (error) {
      logger.error('Failed to create metadata directory:', error);
    }
  }

  // Initialize default metadata
  initializeDefaultMetadata() {
    // Car metadata
    this.set('cars', 'drivers', {
      1: { name: 'Max Verstappen', team: 'Red Bull Racing', number: 1, country: 'NED' },
      44: { name: 'Lewis Hamilton', team: 'Mercedes', number: 44, country: 'GBR' },
      16: { name: 'Charles Leclerc', team: 'Ferrari', number: 16, country: 'MON' },
      63: { name: 'George Russell', team: 'Mercedes', number: 63, country: 'GBR' },
      55: { name: 'Carlos Sainz', team: 'Ferrari', number: 55, country: 'ESP' },
      11: { name: 'Sergio Perez', team: 'Red Bull Racing', number: 11, country: 'MEX' },
      4: { name: 'Lando Norris', team: 'McLaren', number: 4, country: 'GBR' },
      81: { name: 'Oscar Piastri', team: 'McLaren', number: 81, country: 'AUS' },
      14: { name: 'Fernando Alonso', team: 'Aston Martin', number: 14, country: 'ESP' },
      18: { name: 'Lance Stroll', team: 'Aston Martin', number: 18, country: 'CAN' },
      3: { name: 'Daniel Ricciardo', team: 'AlphaTauri', number: 3, country: 'AUS' },
      31: { name: 'Esteban Ocon', team: 'Alpine', number: 31, country: 'FRA' },
      10: { name: 'Pierre Gasly', team: 'Alpine', number: 10, country: 'FRA' },
      20: { name: 'Kevin Magnussen', team: 'Haas', number: 20, country: 'DEN' },
      22: { name: 'Yuki Tsunoda', team: 'AlphaTauri', number: 22, country: 'JPN' },
      27: { name: 'Nico Hulkenberg', team: 'Haas', number: 27, country: 'GER' },
      24: { name: 'Zhou Guanyu', team: 'Alfa Romeo', number: 24, country: 'CHN' },
      2: { name: 'Logan Sargeant', team: 'Williams', number: 2, country: 'USA' },
      77: { name: 'Valtteri Bottas', team: 'Alfa Romeo', number: 77, country: 'FIN' },
      23: { name: 'Alexander Albon', team: 'Williams', number: 23, country: 'THA' }
    });

    // Team metadata
    this.set('teams', 'info', {
      'Red Bull Racing': {
        color: '#1E41FF',
        base: 'Milton Keynes, UK',
        chassis: 'RB20',
        engine: 'Honda RBPT'
      },
      'Mercedes': {
        color: '#00D2BE',
        base: 'Brackley, UK',
        chassis: 'W15',
        engine: 'Mercedes'
      },
      'Ferrari': {
        color: '#DC0000',
        base: 'Maranello, Italy',
        chassis: 'SF-24',
        engine: 'Ferrari'
      },
      'McLaren': {
        color: '#FF8700',
        base: 'Woking, UK',
        chassis: 'MCL38',
        engine: 'Mercedes'
      },
      'Aston Martin': {
        color: '#006F62',
        base: 'Silverstone, UK',
        chassis: 'AMR24',
        engine: 'Mercedes'
      },
      'Alpine': {
        color: '#0090FF',
        base: 'Enstone, UK',
        chassis: 'A524',
        engine: 'Renault'
      },
      'AlphaTauri': {
        color: '#2B4562',
        base: 'Faenza, Italy',
        chassis: 'AT04',
        engine: 'Honda RBPT'
      },
      'Haas': {
        color: '#FFFFFF',
        base: 'Kannapolis, USA',
        chassis: 'VF-24',
        engine: 'Ferrari'
      },
      'Alfa Romeo': {
        color: '#900000',
        base: 'Hinwil, Switzerland',
        chassis: 'C43',
        engine: 'Ferrari'
      },
      'Williams': {
        color: '#005AFF',
        base: 'Grove, UK',
        chassis: 'FW46',
        engine: 'Mercedes'
      }
    });

    // Track metadata
    this.set('tracks', 'circuits', {
      'Monza': {
        name: 'Autodromo Nazionale Monza',
        country: 'Italy',
        length: 5793,
        laps: 53,
        distance: 306.720,
        record: { time: '1:21.046', driver: 'Rubens Barrichello', year: 2004 }
      },
      'Silverstone': {
        name: 'Silverstone Circuit',
        country: 'UK',
        length: 5891,
        laps: 52,
        distance: 306.198,
        record: { time: '1:27.097', driver: 'Max Verstappen', year: 2020 }
      },
      'Spa': {
        name: 'Circuit de Spa-Francorchamps',
        country: 'Belgium',
        length: 7004,
        laps: 44,
        distance: 308.052,
        record: { time: '1:46.286', driver: 'Valtteri Bottas', year: 2018 }
      }
    });

    // Race session metadata
    this.set('race', 'current', {
      season: 2024,
      round: 1,
      name: 'Italian Grand Prix',
      circuit: 'Monza',
      date: '2024-09-01',
      time: '15:00:00',
      status: 'UPCOMING'
    });

    logger.info('Default metadata initialized');
  }

  // Set metadata
  set(category, key, value) {
    if (!this.metadata.has(category)) {
      this.metadata.set(category, new Map());
    }

    const categoryMap = this.metadata.get(category);
    categoryMap.set(key, {
      value,
      timestamp: Date.now(),
      version: 1
    });

    logger.debug(`Metadata set: ${category}.${key}`);
  }

  // Get metadata
  get(category, key) {
    const categoryMap = this.metadata.get(category);
    if (!categoryMap) return null;

    const entry = categoryMap.get(key);
    return entry ? entry.value : null;
  }

  // Get all metadata in a category
  getCategory(category) {
    const categoryMap = this.metadata.get(category);
    if (!categoryMap) return {};

    const result = {};
    for (const [key, entry] of categoryMap.entries()) {
      result[key] = entry.value;
    }
    return result;
  }

  // Get all metadata
  getAll() {
    const result = {};
    for (const [category, categoryMap] of this.metadata.entries()) {
      result[category] = {};
      for (const [key, entry] of categoryMap.entries()) {
        result[category][key] = entry.value;
      }
    }
    return result;
  }

  // Update metadata (increment version)
  update(category, key, value) {
    const categoryMap = this.metadata.get(category);
    if (!categoryMap) {
      this.set(category, key, value);
      return;
    }

    const existing = categoryMap.get(key);
    const newVersion = existing ? existing.version + 1 : 1;

    categoryMap.set(key, {
      value,
      timestamp: Date.now(),
      version: newVersion
    });

    logger.debug(`Metadata updated: ${category}.${key} (v${newVersion})`);
  }

  // Delete metadata
  delete(category, key) {
    const categoryMap = this.metadata.get(category);
    if (!categoryMap) return false;

    const deleted = categoryMap.delete(key);
    if (deleted) {
      logger.debug(`Metadata deleted: ${category}.${key}`);
    }
    return deleted;
  }

  // Check if metadata exists
  exists(category, key) {
    const categoryMap = this.metadata.get(category);
    return categoryMap ? categoryMap.has(key) : false;
  }

  // Get metadata with version info
  getWithInfo(category, key) {
    const categoryMap = this.metadata.get(category);
    if (!categoryMap) return null;

    return categoryMap.get(key) || null;
  }

  // Persist metadata to disk
  persistMetadata() {
    try {
      const dataToPersist = {};

      for (const [category, categoryMap] of this.metadata.entries()) {
        dataToPersist[category] = {};
        for (const [key, entry] of categoryMap.entries()) {
          dataToPersist[category][key] = entry;
        }
      }

      const filePath = path.join(this.dataDir, 'metadata.json');
      fs.writeFileSync(filePath, JSON.stringify(dataToPersist, null, 2));

      logger.debug('Metadata persisted to disk');
    } catch (error) {
      logger.error('Error persisting metadata:', error);
    }
  }

  // Load persisted metadata
  loadPersistedMetadata() {
    try {
      const filePath = path.join(this.dataDir, 'metadata.json');

      if (fs.existsSync(filePath)) {
        const dataStr = fs.readFileSync(filePath, 'utf8');
        const persistedData = JSON.parse(dataStr);

        for (const [category, categoryData] of Object.entries(persistedData)) {
          if (!this.metadata.has(category)) {
            this.metadata.set(category, new Map());
          }

          const categoryMap = this.metadata.get(category);
          for (const [key, entry] of Object.entries(categoryData)) {
            categoryMap.set(key, entry);
          }
        }

        logger.info(`Loaded metadata for ${Object.keys(persistedData).length} categories`);
      }
    } catch (error) {
      logger.error('Error loading persisted metadata:', error);
    }
  }

  // Start persistence timer
  startPersistenceTimer() {
    setInterval(() => {
      this.persistMetadata();
    }, this.persistenceInterval);
  }

  // Race-specific metadata methods
  getDriverInfo(carId) {
    const drivers = this.get('cars', 'drivers');
    return drivers ? drivers[carId] : null;
  }

  getTeamInfo(teamName) {
    const teams = this.get('teams', 'info');
    return teams ? teams[teamName] : null;
  }

  getTrackInfo(trackName) {
    const tracks = this.get('tracks', 'circuits');
    return tracks ? tracks[trackName] : null;
  }

  getCurrentRace() {
    return this.get('race', 'current');
  }

  updateRaceStatus(status) {
    const currentRace = this.getCurrentRace();
    if (currentRace) {
      currentRace.status = status;
      this.update('race', 'current', currentRace);
    }
  }

  // Add new driver
  addDriver(carId, driverInfo) {
    const drivers = this.get('cars', 'drivers') || {};
    drivers[carId] = driverInfo;
    this.update('cars', 'drivers', drivers);
  }

  // Add new team
  addTeam(teamName, teamInfo) {
    const teams = this.get('teams', 'info') || {};
    teams[teamName] = teamInfo;
    this.update('teams', 'info', teams);
  }

  // Add new track
  addTrack(trackName, trackInfo) {
    const tracks = this.get('tracks', 'circuits') || {};
    tracks[trackName] = trackInfo;
    this.update('tracks', 'circuits', tracks);
  }

  // Get metadata statistics
  getStats() {
    let totalCategories = this.metadata.size;
    let totalKeys = 0;
    let totalSize = 0;

    for (const categoryMap of this.metadata.values()) {
      totalKeys += categoryMap.size;
      for (const entry of categoryMap.values()) {
        totalSize += JSON.stringify(entry).length;
      }
    }

    return {
      categories: totalCategories,
      keys: totalKeys,
      estimatedSize: totalSize,
      persistenceInterval: this.persistenceInterval
    };
  }

  // Clear all metadata
  clear() {
    this.metadata.clear();
    logger.info('Metadata store cleared');
  }

  // Export metadata
  export() {
    return JSON.stringify(this.getAll(), null, 2);
  }

  // Import metadata
  import(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.metadata.clear();

      for (const [category, categoryData] of Object.entries(data)) {
        this.metadata.set(category, new Map(Object.entries(categoryData)));
      }

      logger.info('Metadata imported successfully');
      return true;
    } catch (error) {
      logger.error('Error importing metadata:', error);
      return false;
    }
  }

  // Search metadata
  search(query, category = null) {
    const results = [];
    const searchTerm = query.toLowerCase();

    const categoriesToSearch = category ? [category] : Array.from(this.metadata.keys());

    categoriesToSearch.forEach(cat => {
      const categoryMap = this.metadata.get(cat);
      if (!categoryMap) return;

      for (const [key, entry] of categoryMap.entries()) {
        const valueStr = JSON.stringify(entry.value).toLowerCase();
        if (valueStr.includes(searchTerm) || key.toLowerCase().includes(searchTerm)) {
          results.push({
            category: cat,
            key,
            value: entry.value,
            timestamp: entry.timestamp,
            version: entry.version
          });
        }
      }
    });

    return results;
  }
}

export default MetadataStore;