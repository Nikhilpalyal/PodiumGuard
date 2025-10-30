// Simple test API for PodiumGuard X Backend
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const port = 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PodiumGuard X Backend is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    components: {
      backend: 'active',
      aiEngine: 'not started',
      database: 'not connected',
      contract: 'not deployed'
    },
    endpoints: [
      'GET /health - Health check',
      'GET /api/test - API test',
      'GET /api/stats - System statistics (when fully running)',
      'POST /api/simulate - Attack simulation (when AI engine is running)'
    ]
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    message: 'Stats endpoint (demo mode)',
    summary: {
      attacksDetected: 0,
      totalTransactionsScanned: 0,
      averageGasFee: 0,
      systemMode: 'Normal (Demo)',
      detectionRate: 0
    },
    note: 'This is demo data. Full functionality requires AI engine and database connection.'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableEndpoints: ['/health', '/api/test', '/api/stats']
  });
});

// Start server
server.listen(port, () => {
  console.log(`🛡️  PodiumGuard X Backend Test Server`);
  console.log(`🌐 Server running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🧪 API test: http://localhost:${port}/api/test`);
  console.log(`📈 Stats demo: http://localhost:${port}/api/stats`);
  console.log(`🛑 Press Ctrl+C to stop`);
});

export default app;