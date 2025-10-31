# Race Telemetry Engine Integration Guide

This guide provides step-by-step instructions for integrating the `<race-telemetry-engine>` Web Component into your existing F1 blockchain-AI dashboard.

## Quick Start

### 1. Include the Component

Add the component script to your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>F1 Dashboard</title>
  <script type="module" src="./race-telemetry-engine.ts"></script>
</head>
<body>
  <!-- Your existing dashboard content -->
  <div id="dashboard">
    <!-- Add the telemetry engine here -->
  </div>
</body>
</html>
```

### 2. Add the Component to Your Dashboard

```html
<div id="dashboard">
  <header>
    <h1>F1 Race Dashboard</h1>
  </header>

  <main>
    <section class="telemetry-section">
      <h2>Live Race Telemetry</h2>
      <race-telemetry-engine
        ws-url="wss://api.racehub.ai/live"
        ai-endpoint="https://ai.racehub.ai/predict"
        chain-endpoint="https://chain.racehub.ai/log"
        race-id="F1-2025-ROUND-12"
        theme="dark">
      </race-telemetry-engine>
    </section>

    <!-- Your other dashboard components -->
  </main>
</div>
```

### 3. Style Integration

Add CSS to make the component fit your dashboard:

```css
.telemetry-section {
  margin: 20px 0;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  border: 1px solid #333;
}

race-telemetry-engine {
  max-width: 100%;
  margin: 0 auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .telemetry-section {
    padding: 10px;
  }

  race-telemetry-engine {
    font-size: 0.9em;
  }
}
```

## Backend Integration

### WebSocket Server Setup

Your backend needs to provide a WebSocket endpoint that streams telemetry data:

```javascript
// Node.js example with ws library
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected to telemetry stream');

  // Send telemetry data every second
  const interval = setInterval(() => {
    const telemetry = {
      carId: 'HAM',
      driver: 'Lewis Hamilton',
      team: 'Mercedes',
      speed: Math.floor(Math.random() * 50) + 250,
      position: 1,
      lap: 45,
      event: 'normal',
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(telemetry));
  }, 1000);

  ws.on('close', () => {
    clearInterval(interval);
  });
});
```

### AI Prediction Endpoint

Create a REST API for AI predictions:

```javascript
// Express.js example
app.post('/predict', async (req, res) => {
  const { telemetry } = req.body;

  // Your AI prediction logic here
  const prediction = {
    message: `⚠ Car #${telemetry.carId} expected to decelerate 12% in Sector 2`,
    confidence: 0.91,
    type: 'warning'
  };

  res.json(prediction);
});
```

### Blockchain Logging Endpoint

Implement blockchain logging API:

```javascript
app.post('/log', async (req, res) => {
  const { hash, raceId } = req.body;

  try {
    // Log to blockchain (Polygon/Ethereum)
    const txHash = await logToBlockchain(hash, raceId);

    res.json({
      txHash: txHash,
      verified: true
    });
  } catch (error) {
    res.status(500).json({
      txHash: null,
      verified: false,
      error: error.message
    });
  }
});
```

## Advanced Integration Examples

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';

function RaceDashboard() {
  const telemetryRef = useRef(null);

  useEffect(() => {
    const engine = telemetryRef.current;

    // Listen for telemetry events
    const handleTelemetryUpdate = (event) => {
      console.log('Telemetry update:', event.detail);
      // Update your React state here
    };

    const handleAlert = (event) => {
      console.log('AI Alert:', event.detail);
      // Show notification in your UI
    };

    engine.addEventListener('telemetry-update', handleTelemetryUpdate);
    engine.addEventListener('alert-triggered', handleAlert);

    return () => {
      engine.removeEventListener('telemetry-update', handleTelemetryUpdate);
      engine.removeEventListener('alert-triggered', handleAlert);
    };
  }, []);

  return (
    <div className="dashboard">
      <h1>F1 Race Dashboard</h1>

      <race-telemetry-engine
        ref={telemetryRef}
        ws-url="wss://api.racehub.ai/live"
        ai-endpoint="https://ai.racehub.ai/predict"
        chain-endpoint="https://chain.racehub.ai/log"
        race-id="F1-2025-ROUND-12"
        theme="dark">
      </race-telemetry-engine>

      {/* Your other React components */}
    </div>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div class="dashboard">
    <h1>F1 Race Dashboard</h1>

    <race-telemetry-engine
      ref="telemetryEngine"
      ws-url="wss://api.racehub.ai/live"
      ai-endpoint="https://ai.racehub.ai/predict"
      chain-endpoint="https://chain.racehub.ai/log"
      race-id="F1-2025-ROUND-12"
      theme="dark"
      @telemetry-update="handleTelemetryUpdate"
      @alert-triggered="handleAlert">
    </race-telemetry-engine>
  </div>
</template>

<script>
export default {
  name: 'RaceDashboard',
  methods: {
    handleTelemetryUpdate(event) {
      console.log('Telemetry:', event.detail);
      // Update Vue data here
    },

    handleAlert(event) {
      console.log('Alert:', event.detail);
      // Show alert in UI
    }
  },

  mounted() {
    // Access component methods
    const engine = this.$refs.telemetryEngine;
    console.log('Current state:', engine.getCurrentState());
  }
}
</script>
```

### Angular Integration

```typescript
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

@Component({
  selector: 'app-race-dashboard',
  template: `
    <div class="dashboard">
      <h1>F1 Race Dashboard</h1>

      <race-telemetry-engine
        #telemetryEngine
        ws-url="wss://api.racehub.ai/live"
        ai-endpoint="https://ai.racehub.ai/predict"
        chain-endpoint="https://chain.racehub.ai/log"
        race-id="F1-2025-ROUND-12"
        theme="dark">
      </race-telemetry-engine>
    </div>
  `
})
export class RaceDashboardComponent implements OnInit {
  @ViewChild('telemetryEngine', { static: true })
  telemetryEngine!: ElementRef;

  ngOnInit() {
    const engine = this.telemetryEngine.nativeElement;

    // Listen for events
    engine.addEventListener('telemetry-update', (event: any) => {
      console.log('Telemetry:', event.detail);
    });

    engine.addEventListener('alert-triggered', (event: any) => {
      console.log('Alert:', event.detail);
    });
  }

  getTelemetryState() {
    return this.telemetryEngine.nativeElement.getCurrentState();
  }

  simulateData() {
    this.telemetryEngine.nativeElement.simulateDemoData();
  }
}
```

## Dynamic Configuration

### Runtime Configuration Changes

```javascript
const engine = document.querySelector('race-telemetry-engine');

// Change WebSocket URL
engine.setAttribute('ws-url', 'wss://new-api.racehub.ai/live');

// Update AI endpoint
engine.setAttribute('ai-endpoint', 'https://new-ai.racehub.ai/predict');

// Switch theme
engine.setAttribute('theme', 'light');
```

### Environment-Based Configuration

```javascript
// config.js
const config = {
  development: {
    wsUrl: 'ws://localhost:8080/race',
    aiEndpoint: 'http://localhost:3001/predict',
    chainEndpoint: 'http://localhost:3001/log'
  },
  production: {
    wsUrl: 'wss://api.racehub.ai/live',
    aiEndpoint: 'https://ai.racehub.ai/predict',
    chainEndpoint: 'https://chain.racehub.ai/log'
  }
};

const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env];

// Apply configuration
const engine = document.querySelector('race-telemetry-engine');
engine.setAttribute('ws-url', currentConfig.wsUrl);
engine.setAttribute('ai-endpoint', currentConfig.aiEndpoint);
engine.setAttribute('chain-endpoint', currentConfig.chainEndpoint);
```

## Event Handling

### Comprehensive Event Listener Setup

```javascript
const engine = document.querySelector('race-telemetry-engine');

// Telemetry updates
engine.addEventListener('telemetry-update', (event) => {
  const data = event.detail;
  updateSpeedDisplay(data.speed);
  updatePosition(data.position);
});

// AI alerts
engine.addEventListener('alert-triggered', (event) => {
  const alert = event.detail;
  showNotification(alert.message, alert.type);
  logAlert(alert);
});

// Blockchain verification
engine.addEventListener('on-chain-verified', (event) => {
  const confirmation = event.detail;
  updateVerificationStatus(confirmation.verified);
  if (confirmation.verified) {
    showSuccessMessage(`Verified: ${confirmation.txHash}`);
  }
});

// Connection events
engine.addEventListener('connection-opened', () => {
  showConnectionStatus('Connected', 'success');
});

engine.addEventListener('connection-closed', () => {
  showConnectionStatus('Disconnected', 'warning');
});

engine.addEventListener('connection-error', (event) => {
  showConnectionStatus('Connection Error', 'error');
  console.error('Connection error:', event.detail);
});
```

## Custom Styling and Theming

### CSS Custom Properties

```css
race-telemetry-engine {
  --primary-bg: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  --secondary-bg: rgba(0, 0, 0, 0.5);
  --border-color: #ff0000;
  --text-color: #ffffff;
  --speed-color: #00ff00;
  --warning-color: #ffff00;
  --critical-color: #ff0000;
  --font-family: 'Orbitron', monospace;
}
```

### Theme Switching

```javascript
function setTheme(theme) {
  const engine = document.querySelector('race-telemetry-engine');

  if (theme === 'light') {
    engine.style.setProperty('--primary-bg', 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)');
    engine.style.setProperty('--secondary-bg', 'rgba(255, 255, 255, 0.8)');
    engine.style.setProperty('--border-color', '#0066cc');
    engine.style.setProperty('--text-color', '#000000');
    engine.style.setProperty('--speed-color', '#0066cc');
  } else {
    // Reset to defaults
    engine.style.setProperty('--primary-bg', 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)');
    engine.style.setProperty('--secondary-bg', 'rgba(0, 0, 0, 0.5)');
    engine.style.setProperty('--border-color', '#ff0000');
    engine.style.setProperty('--text-color', '#ffffff');
    engine.style.setProperty('--speed-color', '#00ff00');
  }

  engine.setAttribute('theme', theme);
}
```

## Error Handling and Resilience

### Connection Recovery

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function setupReconnection() {
  const engine = document.querySelector('race-telemetry-engine');

  engine.addEventListener('connection-error', () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${reconnectAttempts}`);
        engine.connect();
      }, 1000 * reconnectAttempts); // Exponential backoff
    }
  });

  engine.addEventListener('connection-opened', () => {
    reconnectAttempts = 0; // Reset on successful connection
  });
}
```

### Fallback Data Sources

```javascript
function setupFallbackData() {
  const engine = document.querySelector('race-telemetry-engine');

  engine.addEventListener('connection-error', () => {
    // Switch to demo mode when live connection fails
    console.log('Switching to demo mode');
    engine.setAttribute('ws-url', '');
    setInterval(() => {
      engine.simulateDemoData();
    }, 2000);
  });
}
```

## Performance Optimization

### Lazy Loading

```javascript
// Load component only when needed
function loadTelemetryEngine() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = './race-telemetry-engine.ts';
    script.onload = () => {
      resolve();
    };
    document.head.appendChild(script);
  });
}

// Load when user scrolls to telemetry section
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadTelemetryEngine().then(() => {
        // Initialize component
        const container = document.getElementById('telemetry-container');
        container.innerHTML = `
          <race-telemetry-engine
            ws-url="wss://api.racehub.ai/live"
            ai-endpoint="https://ai.racehub.ai/predict"
            chain-endpoint="https://chain.racehub.ai/log"
            race-id="F1-2025-ROUND-12"
            theme="dark">
          </race-telemetry-engine>
        `;
      });
    }
  });
});

observer.observe(document.getElementById('telemetry-section'));
```

## Testing Integration

### Unit Testing Setup

```javascript
// test-integration.js
describe('Race Telemetry Engine Integration', () => {
  let engine;

  beforeEach(() => {
    document.body.innerHTML = `
      <race-telemetry-engine
        ws-url="ws://localhost:8080/test"
        ai-endpoint="http://localhost:3001/predict"
        chain-endpoint="http://localhost:3001/log"
        race-id="TEST-RACE"
        theme="dark">
      </race-telemetry-engine>
    `;
    engine = document.querySelector('race-telemetry-engine');
  });

  test('should connect to WebSocket', () => {
    engine.connect();
    expect(engine.isConnected).toBe(true);
  });

  test('should handle telemetry data', () => {
    const mockData = {
      carId: 'TEST',
      driver: 'Test Driver',
      team: 'Test Team',
      speed: 300,
      position: 1,
      lap: 1,
      event: 'normal',
      timestamp: Date.now()
    };

    engine.handleMessage({ data: JSON.stringify(mockData) });
    const state = engine.getCurrentState();
    expect(state.telemetryData.length).toBeGreaterThan(0);
  });

  test('should emit events', () => {
    const mockEventListener = jest.fn();
    engine.addEventListener('telemetry-update', mockEventListener);

    engine.simulateDemoData();

    expect(mockEventListener).toHaveBeenCalled();
  });
});
```

This integration guide covers the most common scenarios and best practices for incorporating the Race Telemetry Engine into your F1 dashboard. For more advanced use cases or specific framework integrations, refer to the API Reference documentation.