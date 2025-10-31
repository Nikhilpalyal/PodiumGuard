import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';

interface TelemetryData {
  carId: string;
  driver: string;
  team: string;
  speed: number;
  position: number;
  lap: number;
  event: string;
  timestamp: number;
}

interface AIAlert {
  message: string;
  confidence: number;
  type: 'warning' | 'critical';
}

interface BlockchainConfirmation {
  txHash: string;
  verified: boolean;
}

@customElement('race-telemetry-engine')
export class RaceTelemetryEngine extends LitElement {
  @property({ type: String }) wsUrl = '';
  @property({ type: String }) aiEndpoint = '';
  @property({ type: String }) chainEndpoint = '';
  @property({ type: String }) raceId = '';
  @property({ type: String }) theme = 'dark';

  @state() private telemetryData: TelemetryData[] = [];
  @state() private aiAlerts: AIAlert[] = [];
  @state() private blockchainConfirmations: BlockchainConfirmation[] = [];
  @state() private isConnected = false;
  @state() private currentSpeed = 0;
  @state() private leaderboard: TelemetryData[] = [];

  private ws: WebSocket | null = null;
  private chart: Chart | null = null;
  private speedHistory: number[] = [];
  private timeHistory: number[] = [];

  static styles = css`
    :host {
      display: block;
      font-family: 'Orbitron', monospace;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .live-indicator {
      color: #00ff00;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .dashboard {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .speedometer {
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border: 2px solid #ff0000;
    }

    .speed-display {
      font-size: 3em;
      font-weight: bold;
      color: #00ff00;
    }

    .leaderboard {
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 20px;
      border: 2px solid #ff0000;
    }

    .leaderboard-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 5px;
      border-radius: 5px;
    }

    .leaderboard-item.top {
      background: rgba(255, 215, 0, 0.2);
    }

    .alerts {
      grid-column: span 2;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 20px;
      border: 2px solid #ff0000;
    }

    .alert {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 5px;
    }

    .alert.warning {
      background: rgba(255, 255, 0, 0.2);
      border-left: 5px solid #ffff00;
    }

    .alert.critical {
      background: rgba(255, 0, 0, 0.2);
      border-left: 5px solid #ff0000;
    }

    .chart-container {
      grid-column: span 2;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 20px;
      border: 2px solid #ff0000;
    }

    .blockchain-status {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 0.8em;
    }

    .verified {
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
    }

    .pending {
      background: rgba(255, 255, 0, 0.2);
      color: #ffff00;
    }

    @media (max-width: 768px) {
      .dashboard {
        grid-template-columns: 1fr;
      }

      .chart-container, .alerts {
        grid-column: span 1;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.connect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('telemetryData')) {
      this.updateLeaderboard();
      this.updateChart();
    }
  }

  render() {
    return html`
      <div class="header">
        <h2>RACE TELEMETRY ENGINE</h2>
        <span class="live-indicator">${this.isConnected ? '● LIVE' : '● OFFLINE'}</span>
      </div>

      <div class="dashboard">
        <div class="speedometer">
          <h3>Current Speed</h3>
          <div class="speed-display">${this.currentSpeed} km/h</div>
        </div>

        <div class="leaderboard">
          <h3>Leaderboard</h3>
          ${this.leaderboard.slice(0, 5).map((car, index) => html`
            <div class="leaderboard-item ${index < 3 ? 'top' : ''}">
              <span>${car.position}. ${car.driver}</span>
              <span>${car.team}</span>
            </div>
          `)}
        </div>

        <div class="alerts">
          <h3>AI Alerts</h3>
          ${this.aiAlerts.map(alert => html`
            <div class="alert ${alert.type}">
              ${alert.message} (Confidence: ${(alert.confidence * 100).toFixed(1)}%)
            </div>
          `)}
        </div>

        <div class="chart-container">
          <canvas id="speedChart"></canvas>
        </div>
      </div>

      <div class="blockchain-status ${this.blockchainConfirmations.length > 0 && this.blockchainConfirmations[0].verified ? 'verified' : 'pending'}">
        ${this.blockchainConfirmations.length > 0 && this.blockchainConfirmations[0].verified ? '✓ Verified On-Chain' : '⚠ Pending Validation'}
      </div>
    `;
  }

  connect() {
    if (this.wsUrl && !this.ws) {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => {
        this.isConnected = true;
        this.dispatchEvent(new CustomEvent('connection-opened'));
      };
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = () => {
        this.isConnected = false;
        this.dispatchEvent(new CustomEvent('connection-closed'));
      };
      this.ws.onerror = (error) => {
        this.dispatchEvent(new CustomEvent('connection-error', { detail: error }));
      };
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data: TelemetryData = JSON.parse(event.data);
      this.telemetryData = [...this.telemetryData.slice(-9), data]; // Keep last 10
      this.currentSpeed = data.speed;
      this.speedHistory.push(data.speed);
      this.timeHistory.push(Date.now());

      // Keep only last 50 data points for chart
      if (this.speedHistory.length > 50) {
        this.speedHistory.shift();
        this.timeHistory.shift();
      }

      this.dispatchEvent(new CustomEvent('telemetry-update', { detail: data }));

      // Simulate AI prediction
      if (this.aiEndpoint) {
        this.requestAIPrediction(data);
      }

      // Simulate blockchain logging
      if (this.chainEndpoint) {
        this.logToBlockchain(data);
      }
    } catch (error) {
      console.error('Error parsing telemetry data:', error);
    }
  }

  private async requestAIPrediction(data: TelemetryData) {
    try {
      const response = await fetch(this.aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry: data })
      });
      const prediction: AIAlert = await response.json();
      this.aiAlerts = [...this.aiAlerts.slice(-4), prediction]; // Keep last 5 alerts
      this.dispatchEvent(new CustomEvent('alert-triggered', { detail: prediction }));
    } catch (error) {
      console.error('AI prediction error:', error);
    }
  }

  private async logToBlockchain(data: TelemetryData) {
    try {
      const hash = await this.hashTelemetry(data);
      const response = await fetch(this.chainEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, raceId: this.raceId })
      });
      const confirmation: BlockchainConfirmation = await response.json();
      this.blockchainConfirmations = [confirmation];
      this.dispatchEvent(new CustomEvent('on-chain-verified', { detail: confirmation }));
    } catch (error) {
      console.error('Blockchain logging error:', error);
    }
  }

  private async hashTelemetry(data: TelemetryData): Promise<string> {
    // Use Web Crypto API for SHA-256 hashing
    const encoder = new TextEncoder();
    const dataStr = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private updateLeaderboard() {
    this.leaderboard = [...this.telemetryData]
      .sort((a, b) => a.position - b.position)
      .filter((car, index, arr) => arr.findIndex(c => c.carId === car.carId) === index);
  }

  private updateChart() {
    const canvas = this.shadowRoot?.querySelector('#speedChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.timeHistory.map(t => new Date(t).toLocaleTimeString()),
        datasets: [{
          label: 'Speed (km/h)',
          data: this.speedHistory,
          borderColor: '#00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#ffffff'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#ffffff'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          }
        }
      }
    });
  }

  getCurrentState() {
    return {
      telemetryData: this.telemetryData,
      aiAlerts: this.aiAlerts,
      blockchainConfirmations: this.blockchainConfirmations,
      isConnected: this.isConnected,
      currentSpeed: this.currentSpeed,
      leaderboard: this.leaderboard
    };
  }

  async logOnChain(snapshot: TelemetryData) {
    return this.logToBlockchain(snapshot);
  }

  simulateDemoData() {
    const demoData: TelemetryData = {
      carId: `car${Math.floor(Math.random() * 20) + 1}`,
      driver: `Driver ${Math.floor(Math.random() * 20) + 1}`,
      team: ['Mercedes', 'Red Bull', 'Ferrari', 'McLaren'][Math.floor(Math.random() * 4)],
      speed: Math.floor(Math.random() * 100) + 200,
      position: Math.floor(Math.random() * 20) + 1,
      lap: Math.floor(Math.random() * 50) + 1,
      event: 'normal',
      timestamp: Date.now()
    };
    this.handleMessage({ data: JSON.stringify(demoData) } as MessageEvent);
  }
}