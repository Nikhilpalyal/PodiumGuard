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

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time-to-live for each key
    this.maxSize = 1000; // Maximum cache size
    this.defaultTTL = 300000; // 5 minutes default TTL
    this.cleanupInterval = 60000; // Clean up expired entries every minute
    this.startCleanupTimer();
  }

  // Set a value in cache with optional TTL
  set(key, value, ttl = this.defaultTTL) {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    });

    this.ttl.set(key, ttl);

    logger.debug(`Cached key: ${key}, TTL: ${ttl}ms`);
  }

  // Get a value from cache
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  // Check if a key exists and is not expired
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this.isExpired(key);
  }

  // Delete a key from cache
  delete(key) {
    const deleted = this.cache.delete(key);
    this.ttl.delete(key);

    if (deleted) {
      logger.debug(`Deleted from cache: ${key}`);
    }

    return deleted;
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttl.clear();
    logger.info('Cache cleared');
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      expiredEntries: entries.filter(([key]) => this.isExpired(key)).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(([, entry]) => entry.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(([, entry]) => entry.timestamp)) : null,
      averageTTL: this.calculateAverageTTL(),
      totalAccesses: entries.reduce((sum, [, entry]) => sum + entry.accessCount, 0)
    };
  }

  // Check if a key is expired
  isExpired(key) {
    const entry = this.cache.get(key);
    const ttl = this.ttl.get(key);

    if (!entry || !ttl) return true;

    return (Date.now() - entry.timestamp) > ttl;
  }

  // Evict the oldest entry when cache is full
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      logger.debug(`Evicted oldest entry: ${oldestKey}`);
    }
  }

  // Start cleanup timer for expired entries
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Remove expired entries
  cleanup() {
    const expiredKeys = [];

    for (const [key] of this.cache.entries()) {
      if (this.isExpired(key)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // Calculate hit rate (simplified - would need more tracking in production)
  calculateHitRate() {
    // This is a simplified calculation
    // In production, you'd track hits vs misses separately
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);

    return totalAccesses > 0 ? (totalAccesses / (totalAccesses + this.cache.size)) : 0;
  }

  // Calculate average TTL
  calculateAverageTTL() {
    const ttls = Array.from(this.ttl.values());
    return ttls.length > 0 ? ttls.reduce((a, b) => a + b, 0) / ttls.length : 0;
  }

  // Get all keys
  keys() {
    return Array.from(this.cache.keys()).filter(key => !this.isExpired(key));
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Set maximum cache size
  setMaxSize(maxSize) {
    this.maxSize = maxSize;
    logger.info(`Cache max size set to: ${maxSize}`);
  }

  // Set default TTL
  setDefaultTTL(ttl) {
    this.defaultTTL = ttl;
    logger.info(`Default TTL set to: ${ttl}ms`);
  }

  // Race-specific cache methods
  setRaceData(key, data, ttl = 30000) { // 30 seconds for race data
    this.set(`race:${key}`, data, ttl);
  }

  getRaceData(key) {
    return this.get(`race:${key}`);
  }

  setTelemetryData(carId, data, ttl = 10000) { // 10 seconds for telemetry
    this.set(`telemetry:${carId}`, data, ttl);
  }

  getTelemetryData(carId) {
    return this.get(`telemetry:${carId}`);
  }

  setLeaderboard(data, ttl = 5000) { // 5 seconds for leaderboard
    this.set('leaderboard', data, ttl);
  }

  getLeaderboard() {
    return this.get('leaderboard');
  }

  setAnalyticsData(key, data, ttl = 60000) { // 1 minute for analytics
    this.set(`analytics:${key}`, data, ttl);
  }

  getAnalyticsData(key) {
    return this.get(`analytics:${key}`);
  }

  // Batch operations
  setMultiple(entries, ttl = this.defaultTTL) {
    entries.forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
  }

  getMultiple(keys) {
    const results = {};
    keys.forEach(key => {
      results[key] = this.get(key);
    });
    return results;
  }

  deleteMultiple(keys) {
    return keys.map(key => this.delete(key));
  }

  // Cache warming for race data
  warmRaceCache() {
    // Pre-populate cache with common race data structures
    this.set('race:session', { type: 'RACE', status: 'ACTIVE' }, 300000);
    this.set('race:track', { name: 'Monza', length: 5793 }, 86400000); // 24 hours
    this.set('race:weather', { condition: 'DRY', temperature: 25 }, 60000);

    logger.info('Race cache warmed');
  }

  // Memory monitoring
  getMemoryUsage() {
    const stats = this.getStats();
    return {
      entries: stats.size,
      estimatedSize: this.estimateMemoryUsage(),
      hitRate: stats.hitRate,
      cleanupInterval: this.cleanupInterval
    };
  }

  // Estimate memory usage
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Rough estimate for string keys
      totalSize += JSON.stringify(entry.value).length * 2; // Rough estimate for values
      totalSize += 100; // Overhead per entry
    }

    return totalSize;
  }
}

export default CacheService;