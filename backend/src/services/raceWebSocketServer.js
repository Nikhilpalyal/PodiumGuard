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

class RaceWebSocketServer {
  constructor(io) {
    this.io = io;
    this.channels = new Map(); // channel -> Set of socket IDs
    this.clientSubscriptions = new Map(); // socketId -> Set of channels
    this.broadcastStats = {
      totalMessages: 0,
      activeConnections: 0,
      messagesPerSecond: 0
    };

    this.setupWebSocketHandlers();
    this.startStatsTimer();
  }

  // Setup WebSocket event handlers
  setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Race WebSocket client connected: ${socket.id}`);
      this.broadcastStats.activeConnections++;

      // Handle subscription to channels
      socket.on('subscribe', (data) => {
        this.subscribeClient(socket, data);
      });

      // Handle unsubscription from channels
      socket.on('unsubscribe', (data) => {
        this.unsubscribeClient(socket, data);
      });

      // Handle client requests
      socket.on('request', (data) => {
        this.handleClientRequest(socket, data);
      });

      // Handle ping for latency measurement
      socket.on('ping', (data) => {
        socket.emit('pong', { ...data, serverTime: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Race WebSocket client disconnected: ${socket.id}`);
        this.broadcastStats.activeConnections--;
        this.cleanupClient(socket.id);
      });
    });
  }

  // Subscribe client to channels
  subscribeClient(socket, data) {
    const { channels } = data;

    if (!Array.isArray(channels)) {
      socket.emit('error', { message: 'Channels must be an array' });
      return;
    }

    // Initialize client subscriptions if needed
    if (!this.clientSubscriptions.has(socket.id)) {
      this.clientSubscriptions.set(socket.id, new Set());
    }

    const clientChannels = this.clientSubscriptions.get(socket.id);

    channels.forEach(channel => {
      // Initialize channel if needed
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set());
      }

      const channelClients = this.channels.get(channel);
      channelClients.add(socket.id);
      clientChannels.add(channel);

      logger.debug(`Client ${socket.id} subscribed to channel: ${channel}`);
    });

    socket.emit('subscribed', { channels });
  }

  // Unsubscribe client from channels
  unsubscribeClient(socket, data) {
    const { channels } = data;

    if (!Array.isArray(channels)) {
      socket.emit('error', { message: 'Channels must be an array' });
      return;
    }

    const clientChannels = this.clientSubscriptions.get(socket.id);
    if (!clientChannels) return;

    channels.forEach(channel => {
      const channelClients = this.channels.get(channel);
      if (channelClients) {
        channelClients.delete(socket.id);
        clientChannels.delete(channel);

        // Clean up empty channels
        if (channelClients.size === 0) {
          this.channels.delete(channel);
        }

        logger.debug(`Client ${socket.id} unsubscribed from channel: ${channel}`);
      }
    });

    socket.emit('unsubscribed', { channels });
  }

  // Handle client requests
  handleClientRequest(socket, data) {
    const { type, payload } = data;

    switch (type) {
      case 'GET_LIVE_DATA':
        // Send current live data snapshot
        this.sendLiveData(socket);
        break;

      case 'GET_CAR_DATA':
        // Send specific car data
        this.sendCarData(socket, payload.carId);
        break;

      case 'GET_LEADERBOARD':
        // Send current leaderboard
        this.sendLeaderboard(socket);
        break;

      default:
        socket.emit('error', { message: `Unknown request type: ${type}` });
    }
  }

  // Broadcast data to channel
  broadcast(channel, data) {
    const channelClients = this.channels.get(channel);
    if (!channelClients || channelClients.size === 0) {
      return;
    }

    const message = {
      channel,
      timestamp: new Date().toISOString(),
      data
    };

    // Send to all clients in the channel
    channelClients.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('message', message);
      }
    });

    this.broadcastStats.totalMessages++;
  }

  // Send live data snapshot to client
  sendLiveData(socket) {
    // This would be populated by the data aggregator
    const liveData = {
      type: 'LIVE_SNAPSHOT',
      timestamp: new Date().toISOString(),
      data: {} // Would contain current race state
    };

    socket.emit('live_data', liveData);
  }

  // Send car-specific data
  sendCarData(socket, carId) {
    const carData = {
      type: 'CAR_DATA',
      carId,
      timestamp: new Date().toISOString(),
      data: {} // Would contain car telemetry
    };

    socket.emit('car_data', carData);
  }

  // Send leaderboard
  sendLeaderboard(socket) {
    const leaderboard = {
      type: 'LEADERBOARD',
      timestamp: new Date().toISOString(),
      data: [] // Would contain current leaderboard
    };

    socket.emit('leaderboard', leaderboard);
  }

  // Broadcast live speed updates
  broadcastSpeedUpdates(speedData) {
    this.broadcast('speeds', {
      type: 'SPEED_UPDATE',
      data: speedData
    });
  }

  // Broadcast race position updates
  broadcastPositionUpdates(positionData) {
    this.broadcast('positions', {
      type: 'POSITION_UPDATE',
      data: positionData
    });
  }

  // Broadcast alerts and warnings
  broadcastAlerts(alerts) {
    this.broadcast('alerts', {
      type: 'ALERTS_UPDATE',
      data: alerts
    });
  }

  // Broadcast pit stop updates
  broadcastPitStops(pitData) {
    this.broadcast('pit_stops', {
      type: 'PIT_STOP_UPDATE',
      data: pitData
    });
  }

  // Broadcast telemetry snapshots
  broadcastTelemetrySnapshot(snapshot) {
    this.broadcast('telemetry', {
      type: 'TELEMETRY_SNAPSHOT',
      data: snapshot
    });
  }

  // Send targeted message to specific client
  sendToClient(socketId, event, data) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Get channel statistics
  getChannelStats() {
    const stats = {};

    for (const [channel, clients] of this.channels.entries()) {
      stats[channel] = {
        subscribers: clients.size,
        active: true
      };
    }

    return stats;
  }

  // Get client statistics
  getClientStats() {
    const stats = {
      totalClients: this.clientSubscriptions.size,
      totalSubscriptions: 0,
      channels: this.channels.size
    };

    for (const subscriptions of this.clientSubscriptions.values()) {
      stats.totalSubscriptions += subscriptions.size;
    }

    return stats;
  }

  // Clean up disconnected client
  cleanupClient(socketId) {
    const clientChannels = this.clientSubscriptions.get(socketId);
    if (clientChannels) {
      // Remove from all channels
      clientChannels.forEach(channel => {
        const channelClients = this.channels.get(channel);
        if (channelClients) {
          channelClients.delete(socketId);

          // Clean up empty channels
          if (channelClients.size === 0) {
            this.channels.delete(channel);
          }
        }
      });

      this.clientSubscriptions.delete(socketId);
    }
  }

  // Start statistics timer
  startStatsTimer() {
    let lastMessageCount = 0;

    setInterval(() => {
      const currentMessages = this.broadcastStats.totalMessages;
      this.broadcastStats.messagesPerSecond = currentMessages - lastMessageCount;
      lastMessageCount = currentMessages;
    }, 1000);
  }

  // Get server statistics
  getStats() {
    return {
      ...this.broadcastStats,
      channels: this.getChannelStats(),
      clients: this.getClientStats(),
      uptime: process.uptime()
    };
  }

  // Force disconnect client
  disconnectClient(socketId, reason = 'Server disconnect') {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('disconnect_reason', { reason });
      socket.disconnect(true);
    }
  }

  // Broadcast server maintenance message
  broadcastMaintenance(message, duration = 30000) {
    this.broadcast('system', {
      type: 'MAINTENANCE',
      message,
      duration,
      timestamp: new Date().toISOString()
    });

    // Schedule reconnection message
    setTimeout(() => {
      this.broadcast('system', {
        type: 'MAINTENANCE_END',
        message: 'Service restored',
        timestamp: new Date().toISOString()
      });
    }, duration);
  }

  // Emergency broadcast
  emergencyBroadcast(message, priority = 'HIGH') {
    this.io.emit('emergency', {
      type: 'EMERGENCY',
      message,
      priority,
      timestamp: new Date().toISOString()
    });

    logger.warn(`Emergency broadcast sent: ${message}`);
  }

  // Close all connections
  close() {
    logger.info('Closing Race WebSocket Server...');

    // Disconnect all clients
    for (const [socketId] of this.io.sockets.sockets) {
      this.disconnectClient(socketId, 'Server shutdown');
    }

    this.channels.clear();
    this.clientSubscriptions.clear();
  }
}

export default RaceWebSocketServer;