import { io } from 'socket.io-client';

class RaceWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.subscribedChannels = new Set();
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.latency = 0;
  }

  // Connect to WebSocket server
  connect(url = 'ws://localhost:5001') {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('Connected to race telemetry server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit('connected', {});

          // Re-subscribe to channels
          this.resubscribeToChannels();

          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from race telemetry server:', reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', { reason });

          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Don't auto-reconnect for intentional disconnects
            return;
          }

          this.attemptReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.emit('connection_error', { error: error.message });
          this.attemptReconnect();
          reject(error);
        });

        // Handle race telemetry messages
        this.socket.on('message', (data) => {
          this.handleMessage(data);
        });

        this.socket.on('live_data', (data) => {
          this.emit('live_data', data);
        });

        this.socket.on('car_data', (data) => {
          this.emit('car_data', data);
        });

        this.socket.on('leaderboard', (data) => {
          this.emit('leaderboard', data);
        });

        this.socket.on('pong', (data) => {
          this.updateLatency(data);
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { error });
        });

        this.socket.on('emergency', (data) => {
          this.emit('emergency', data);
        });

        this.socket.on('maintenance', (data) => {
          this.emit('maintenance', data);
        });

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.subscribedChannels.clear();
      this.emit('disconnected', { reason: 'manual' });
    }
  }

  // Subscribe to event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unsubscribe from event
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit event to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Subscribe to channels
  subscribe(channels) {
    if (!Array.isArray(channels)) {
      channels = [channels];
    }

    const newChannels = channels.filter(channel => !this.subscribedChannels.has(channel));

    if (newChannels.length === 0) return;

    if (this.isConnected) {
      this.socket.emit('subscribe', { channels: newChannels });
    }

    newChannels.forEach(channel => this.subscribedChannels.add(channel));
  }

  // Unsubscribe from channels
  unsubscribe(channels) {
    if (!Array.isArray(channels)) {
      channels = [channels];
    }

    const existingChannels = channels.filter(channel => this.subscribedChannels.has(channel));

    if (existingChannels.length === 0) return;

    if (this.isConnected) {
      this.socket.emit('unsubscribe', { channels: existingChannels });
    }

    existingChannels.forEach(channel => this.subscribedChannels.delete(channel));
  }

  // Send request to server
  request(type, payload = {}) {
    const message = { type, payload };

    if (this.isConnected) {
      this.socket.emit('request', message);
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    this.emit('message', data);

    // Emit specific events based on message type
    if (data.type) {
      this.emit(data.type, data.data || data);
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed', {});
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Connection failed, will try again
      });
    }, delay);
  }

  // Resubscribe to previously subscribed channels
  resubscribeToChannels() {
    if (this.subscribedChannels.size > 0) {
      this.socket.emit('subscribe', { channels: Array.from(this.subscribedChannels) });
    }
  }

  // Flush queued messages
  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.socket.emit('request', message);
    }
  }

  // Start heartbeat for latency measurement
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Update latency based on pong response
  updateLatency(data) {
    if (data.serverTime && data.timestamp) {
      const now = Date.now();
      const sent = data.timestamp;
      const serverReceived = data.serverTime;
      const received = now;

      // Calculate round trip time
      const rtt = received - sent;
      // Estimate one-way latency (half of RTT)
      this.latency = Math.round(rtt / 2);

      this.emit('latency_update', { latency: this.latency, rtt });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      latency: this.latency,
      subscribedChannels: Array.from(this.subscribedChannels),
      reconnectAttempts: this.reconnectAttempts,
      messageQueueLength: this.messageQueue.length
    };
  }

  // Send emergency message (for testing)
  sendEmergency(message, priority = 'HIGH') {
    if (this.isConnected) {
      this.socket.emit('emergency', { message, priority });
    }
  }

  // Get live race data
  getLiveData() {
    this.request('GET_LIVE_DATA');
  }

  // Get specific car data
  getCarData(carId) {
    this.request('GET_CAR_DATA', { carId });
  }

  // Get leaderboard
  getLeaderboard() {
    this.request('GET_LEADERBOARD');
  }

  // Clean up resources
  destroy() {
    this.disconnect();
    this.listeners.clear();
    this.messageQueue.length = 0;
  }
}

// Create singleton instance
const raceWebSocketService = new RaceWebSocketService();

export default raceWebSocketService;