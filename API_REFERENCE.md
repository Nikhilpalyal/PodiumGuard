# Race Telemetry Engine API Reference

## Overview

The `<race-telemetry-engine>` is a standalone Web Component that provides real-time Formula-One race telemetry visualization with AI predictions and blockchain validation. Built with Lit and TypeScript, it offers a complete telemetry intelligence module for F1 dashboards.

## Component Registration

```typescript
import { RaceTelemetryEngine } from './race-telemetry-engine.js';

// Component is auto-registered with customElements.define()
```

## HTML Usage

```html
<race-telemetry-engine
  ws-url="wss://api.racehub.ai/live"
  ai-endpoint="https://ai.racehub.ai/predict"
  chain-endpoint="https://chain.racehub.ai/log"
  race-id="F1-2025-ROUND-12"
  theme="dark">
</race-telemetry-engine>
```

## Properties (Attributes)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `ws-url` | `string` | `''` | WebSocket URL for live telemetry data stream |
| `ai-endpoint` | `string` | `''` | REST endpoint for AI predictions |
| `chain-endpoint` | `string` | `''` | Blockchain logging API endpoint |
| `race-id` | `string` | `''` | Unique race identifier |
| `theme` | `string` | `'dark'` | UI theme (`'dark'` or `'light'`) |

## Public Methods

### `connect()`

Opens WebSocket connection and starts streaming telemetry data.

```javascript
const engine = document.querySelector('race-telemetry-engine');
engine.connect();
```

**Returns:** `void`

### `disconnect()`

Closes WebSocket connection safely.

```javascript
const engine = document.querySelector('race-telemetry-engine');
engine.disconnect();
```

**Returns:** `void`

### `logOnChain(snapshot: TelemetryData)`

Manually logs a telemetry snapshot to the blockchain.

```javascript
const engine = document.querySelector('race-telemetry-engine');
const snapshot = {
  carId: 'HAM',
  driver: 'Lewis Hamilton',
  team: 'Mercedes',
  speed: 312.5,
  position: 1,
  lap: 45,
  event: 'normal',
  timestamp: Date.now()
};
await engine.logOnChain(snapshot);
```

**Parameters:**
- `snapshot` (`TelemetryData`): Telemetry data object to log

**Returns:** `Promise<void>`

### `getCurrentState()`

Returns the current state of all telemetry data.

```javascript
const engine = document.querySelector('race-telemetry-engine');
const state = engine.getCurrentState();
console.log(state);
// {
//   telemetryData: [...],
//   aiAlerts: [...],
//   blockchainConfirmations: [...],
//   isConnected: true,
//   currentSpeed: 312.5,
//   leaderboard: [...]
// }
```

**Returns:** `Object` with the following structure:
```typescript
{
  telemetryData: TelemetryData[];
  aiAlerts: AIAlert[];
  blockchainConfirmations: BlockchainConfirmation[];
  isConnected: boolean;
  currentSpeed: number;
  leaderboard: TelemetryData[];
}
```

### `simulateDemoData()`

Generates and processes mock telemetry data for testing.

```javascript
const engine = document.querySelector('race-telemetry-engine');
engine.simulateDemoData();
```

**Returns:** `void`

## Events

The component dispatches custom events that can be listened to:

### `telemetry-update`

Fired each time new telemetry data is received.

```javascript
const engine = document.querySelector('race-telemetry-engine');
engine.addEventListener('telemetry-update', (event) => {
  console.log('New telemetry:', event.detail);
  // event.detail contains TelemetryData object
});
```

**Event Detail:** `TelemetryData` object

### `alert-triggered`

Fired when an AI alert is generated.

```javascript
engine.addEventListener('alert-triggered', (event) => {
  console.log('AI Alert:', event.detail);
  // event.detail contains AIAlert object
});
```

**Event Detail:** `AIAlert` object

### `on-chain-verified`

Fired when blockchain verification is completed.

```javascript
engine.addEventListener('on-chain-verified', (event) => {
  console.log('Blockchain verified:', event.detail);
  // event.detail contains BlockchainConfirmation object
});
```

**Event Detail:** `BlockchainConfirmation` object

### `connection-opened`

Fired when WebSocket connection is established.

```javascript
engine.addEventListener('connection-opened', () => {
  console.log('Connected to telemetry stream');
});
```

### `connection-closed`

Fired when WebSocket connection is closed.

```javascript
engine.addEventListener('connection-closed', () => {
  console.log('Disconnected from telemetry stream');
});
```

### `connection-error`

Fired when a connection error occurs.

```javascript
engine.addEventListener('connection-error', (event) => {
  console.error('Connection error:', event.detail);
  // event.detail contains Error object
});
```

**Event Detail:** `Error` object

## Data Types

### TelemetryData

```typescript
interface TelemetryData {
  carId: string;        // Unique car identifier
  driver: string;       // Driver name
  team: string;         // Constructor team
  speed: number;        // Speed in km/h
  position: number;     // Race position (1-based)
  lap: number;          // Current lap
  event: string;        // Event type
  timestamp: number;    // Unix timestamp
}
```

### AIAlert

```typescript
interface AIAlert {
  message: string;      // Alert message
  confidence: number;   // Confidence score (0-1)
  type: 'warning' | 'critical';  // Alert severity
}
```

### BlockchainConfirmation

```typescript
interface BlockchainConfirmation {
  txHash: string;       // Transaction hash
  verified: boolean;    // Verification status
}
```

## Styling and Theming

The component uses CSS custom properties for theming. You can override these in your CSS:

```css
race-telemetry-engine {
  --primary-color: #ff0000;
  --secondary-color: #00ff00;
  --background-color: #1a1a1a;
  --text-color: #ffffff;
  --border-color: #333333;
  --warning-color: #ffff00;
  --critical-color: #ff0000;
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires Web Components v1 and ES2020 features.

## Error Handling

The component handles errors gracefully:

- WebSocket connection failures trigger `connection-error` events
- AI prediction failures are logged to console but don't break the component
- Blockchain logging failures show "Pending Validation" status
- Invalid telemetry data is filtered out

## Performance Considerations

- Telemetry data is limited to last 10 updates in memory
- Chart displays last 50 speed data points
- AI alerts are limited to last 5
- WebSocket messages are processed asynchronously

## Security Notes

- All external API calls use HTTPS
- Telemetry data is hashed locally before blockchain logging
- No sensitive data is stored in component state
- WebSocket connections require proper CORS configuration