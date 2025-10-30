import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';

// Import services and routes
import MEVDefenseSystem from './services/mevDefenseSystem.js';
import ContractService from './services/contractService.js';
import AIService from './services/aiService.js';
import SafeModeService from './services/safeModeService.js';

import transactionRoutes from './routes/transactions.js';
import detectionRoutes from './routes/detections.js';
import statsRoutes from './routes/stats.js';
import simulateRoutes from './routes/simulate.js';
import mevDefenseRoutes from './routes/mevDefense.js';

dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'podiumguard-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class PodiumGuardServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    this.port = process.env.PORT || 5000;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.connectDatabase();
    this.initializeServices();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/transactions', transactionRoutes);
    this.app.use('/api/detections', detectionRoutes);
    this.app.use('/api/stats', statsRoutes);
    this.app.use('/api/simulate', simulateRoutes);
    this.app.use('/api/mev', mevDefenseRoutes);

    // MEV Defense specific endpoints
    this.app.get('/api/system/status', (req, res) => {
      const mevDefenseSystem = global.mevDefenseSystem || req.app.locals.mevDefenseSystem;
      if (mevDefenseSystem) {
        res.json({
          success: true,
          data: mevDefenseSystem.getSystemStatus()
        });
      } else {
        res.status(503).json({
          success: false,
          error: 'MEV Defense System not available'
        });
      }
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('subscribe', (data) => {
        logger.info(`Client ${socket.id} subscribed to: ${data.channel}`);
        socket.join(data.channel);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Store io instance globally for services to access
    global.io = this.io;
  }

  async connectDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri || mongoUri === '') {
        logger.warn('⚠️ MongoDB URI not configured - running without database');
        logger.info('💡 Set MONGODB_URI in .env to enable data persistence');
        return;
      }

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('✅ Connected to MongoDB');
    } catch (error) {
      logger.error('❌ MongoDB connection error:', error.message);
      logger.warn('⚠️ Continuing without database - data will not be persisted');
      // Don't exit - continue without database
    }
  }

  async initializeServices() {
    try {
      // Initialize services in order
      logger.info('🚀 Initializing MEV Defense System services...');
      
      // 1. Initialize Contract Service
      this.contractService = new ContractService();
      await this.contractService.initialize();
      logger.info('✅ Contract service initialized');
      
      // 2. Initialize AI Service
      this.aiService = new AIService();
      const aiHealthy = await this.aiService.testConnection();
      if (!aiHealthy) {
        logger.warn('⚠️ AI service not responding - continuing with mock AI analysis');
      } else {
        logger.info('✅ AI service initialized');
      }
      
      // 3. Initialize Safe Mode Service
      this.safeModeService = new SafeModeService(this.contractService, this.io);
      logger.info('✅ Safe mode service initialized');
      
      // 4. Initialize MEV Defense System (replaces mempool listener)
      this.mevDefenseSystem = new MEVDefenseSystem(
        this.aiService, 
        this.contractService, 
        this.safeModeService, 
        this.io
      );
      
      // Start the MEV Defense System
      await this.mevDefenseSystem.start();
      logger.info('🛡️ MEV Defense System started successfully');
      
      logger.info('🎉 All services initialized successfully');
      
      // Store services globally for route access
      global.contractService = this.contractService;
      global.aiService = this.aiService;
      global.safeModeService = this.safeModeService;
      global.mevDefenseSystem = this.mevDefenseSystem;
      
      // Store in app locals as backup
      this.app.locals.contractService = this.contractService;
      this.app.locals.aiService = this.aiService;
      this.app.locals.safeModeService = this.safeModeService;
      this.app.locals.mevDefenseSystem = this.mevDefenseSystem;

      logger.info('🎉 MEV Defense System is ready to protect against MEV attacks!');
      
      logger.info('All services initialized and integrated successfully');
      
      // Log system status
      this.logSystemStatus();
      
    } catch (error) {
      logger.error('Service initialization error:', error);
      process.exit(1);
    }
  }

  logSystemStatus() {
    logger.info('=== MEV Defense System Status ===');
    
    if (this.mevDefenseSystem) {
      const status = this.mevDefenseSystem.getSystemStatus();
      logger.info(`MEV Defense System: ${status.isActive ? 'Active' : 'Inactive'}`);
      logger.info(`Mode: ${status.mode}`);
      logger.info(`Network: ${status.network}`);
    }
    
    logger.info(`AI Service: ${this.aiService ? 'Available' : 'Unavailable'}`);
    
    if (this.contractService && typeof this.contractService.getContractInfo === 'function') {
      logger.info(`Contract Service: ${this.contractService.getContractInfo().hasContract ? 'Connected' : 'Disconnected'}`);
    } else {
      logger.info(`Contract Service: Available (Demo Mode)`);
    }
    
    if (this.safeModeService && typeof this.safeModeService.getStatus === 'function') {
      logger.info(`Safe Mode: ${this.safeModeService.getStatus().currentMode}`);
    } else {
      logger.info(`Safe Mode: Available`);
    }
    
    logger.info('=====================================');
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`PodiumGuard Backend Server running on port ${this.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });
  }
}

// Create and start server
const server = new PodiumGuardServer();
server.start();

export default PodiumGuardServer;