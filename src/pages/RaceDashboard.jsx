import React, { useEffect, useState, useRef } from 'react';
import './RaceDashboard.css';

function RaceDashboard() {
  const [raceData, setRaceData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [telemetryData, setTelemetryData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard, analytics, telemetry
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:5001');

      ws.onopen = () => {
        console.log('Connected to race telemetry server');
        setIsConnected(true);

        // Subscribe to channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['telemetry', 'alerts', 'speeds', 'positions']
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from race telemetry server');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'TELEMETRY_SNAPSHOT':
        setRaceData(data.data);
        break;
      case 'ALERTS_UPDATE':
        setAlerts(data.data || []);
        break;
      case 'SPEED_UPDATE':
        // Update speed data
        break;
      case 'POSITION_UPDATE':
        // Update position data
        break;
      default:
        break;
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/race/leaderboard');
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Fetch car telemetry
  const fetchCarTelemetry = async (carId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/race/cars/${carId}`);
      const data = await response.json();
      if (data.success) {
        setTelemetryData(prev => ({
          ...prev,
          [carId]: data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching car telemetry:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCarSelect = (car) => {
    setSelectedCar(car);
    fetchCarTelemetry(car.carId);
  };

  return (
    <div className="race-dashboard">
      {/* Header */}
      <header className="race-header">
        <div className="race-title">
          <h1>🏎️ F1 Race Telemetry Dashboard</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'LIVE' : 'CONNECTING...'}
          </div>
        </div>

        <div className="race-info">
          <div className="race-details">
            <span className="circuit">Monza Circuit</span>
            <span className="round">Round 1 - Italian Grand Prix</span>
          </div>
          <div className="race-time">
            <span className="lap">Lap 1 / 53</span>
            <span className="time">00:00:00</span>
          </div>
        </div>

        <div className="view-controls">
          <button
            className={viewMode === 'dashboard' ? 'active' : ''}
            onClick={() => setViewMode('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={viewMode === 'analytics' ? 'active' : ''}
            onClick={() => setViewMode('analytics')}
          >
            Analytics
          </button>
          <button
            className={viewMode === 'telemetry' ? 'active' : ''}
            onClick={() => setViewMode('telemetry')}
          >
            Telemetry
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="race-content">
        {viewMode === 'dashboard' && (
          <DashboardView
            raceData={raceData}
            leaderboard={leaderboard}
            alerts={alerts}
            onCarSelect={handleCarSelect}
            selectedCar={selectedCar}
          />
        )}

        {viewMode === 'analytics' && (
          <AnalyticsView raceData={raceData} />
        )}

        {viewMode === 'telemetry' && (
          <TelemetryView
            selectedCar={selectedCar}
            telemetryData={telemetryData}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ raceData, leaderboard, alerts, onCarSelect, selectedCar }) {
  return (
    <div className="dashboard-view">
      {/* Leaderboard */}
      <div className="leaderboard-section">
        <h2>🏆 Leaderboard</h2>
        <div className="leaderboard">
          {leaderboard.map((car, index) => (
            <div
              key={car.carId}
              className={`leaderboard-item ${selectedCar?.carId === car.carId ? 'selected' : ''}`}
              onClick={() => onCarSelect(car)}
            >
              <div className="position">{index + 1}</div>
              <div className="driver-info">
                <div className="driver-name">{car.driver}</div>
                <div className="team-name">{car.team}</div>
              </div>
              <div className="car-stats">
                <div className="speed">{car.speed} km/h</div>
                <div className="gap">{car.gapToLeader === 0 ? 'LEADER' : `+${car.gapToLeader}s`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Track Map */}
      <div className="track-section">
        <h2>🏁 Track Map</h2>
        <div className="track-map">
          <TrackVisualization cars={raceData?.cars || []} />
        </div>
      </div>

      {/* Alerts */}
      <div className="alerts-section">
        <h2>🚨 Race Alerts</h2>
        <div className="alerts-list">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert-item ${alert.severity?.toLowerCase()}`}>
              <span className="alert-icon">{alert.color || '⚠️'}</span>
              <span className="alert-message">{alert.message}</span>
              <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="no-alerts">No active alerts</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Analytics View Component
function AnalyticsView({ raceData }) {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/race/analytics');
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <div className="analytics-view">
      <h2>📊 Race Analytics</h2>

      <div className="analytics-grid">
        {/* Performance Groups */}
        <div className="analytics-card">
          <h3>Performance Groups</h3>
          <div className="performance-groups">
            {analyticsData?.groups && Object.entries(analyticsData.groups).map(([group, cars]) => (
              <div key={group} className={`performance-group ${group}`}>
                <span className="group-name">{group.replace('_', ' ').toUpperCase()}</span>
                <span className="group-count">{cars.length} cars</span>
              </div>
            ))}
          </div>
        </div>

        {/* Speed Statistics */}
        <div className="analytics-card">
          <h3>Speed Statistics</h3>
          <div className="speed-stats">
            <div className="stat-item">
              <span className="stat-label">Average Speed</span>
              <span className="stat-value">{analyticsData?.averageSpeed || 0} km/h</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Speed</span>
              <span className="stat-value">{analyticsData?.speedStats?.maximum || 0} km/h</span>
            </div>
          </div>
        </div>

        {/* Sector Performance */}
        <div className="analytics-card">
          <h3>Sector Performance</h3>
          <div className="sector-performance">
            {analyticsData?.sectorPerformance && Object.entries(analyticsData.sectorPerformance).map(([sector, data]) => (
              <div key={sector} className="sector-item">
                <span className="sector-name">{sector.toUpperCase()}</span>
                <span className="sector-speed">{data.averageSpeed} km/h avg</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Telemetry View Component
function TelemetryView({ selectedCar, telemetryData }) {
  const carData = selectedCar ? telemetryData[selectedCar.carId] : null;

  return (
    <div className="telemetry-view">
      <h2>📡 Telemetry Data</h2>

      {!selectedCar ? (
        <div className="no-selection">
          <p>Select a car from the leaderboard to view telemetry data</p>
        </div>
      ) : (
        <div className="telemetry-content">
          {/* Car Header */}
          <div className="car-header">
            <h3>{selectedCar.driver} - {selectedCar.team}</h3>
            <div className="car-number">#{selectedCar.carId}</div>
          </div>

          {/* Telemetry Cards */}
          <div className="telemetry-cards">
            {/* Speed */}
            <div className="telemetry-card">
              <h4>Speed</h4>
              <div className="telemetry-value">{carData?.current?.speed || 0} km/h</div>
              <div className="telemetry-trend">
                <span>Max: {carData?.speedData?.max || 0} km/h</span>
                <span>Avg: {carData?.speedData?.average || 0} km/h</span>
              </div>
            </div>

            {/* Tire Temperatures */}
            <div className="telemetry-card">
              <h4>Tire Temperatures</h4>
              <div className="tire-temps">
                <div className="tire-temp">
                  <span>FL</span>
                  <span>{carData?.current?.tireTemperatures?.frontLeft || 0}°C</span>
                </div>
                <div className="tire-temp">
                  <span>FR</span>
                  <span>{carData?.current?.tireTemperatures?.frontRight || 0}°C</span>
                </div>
                <div className="tire-temp">
                  <span>RL</span>
                  <span>{carData?.current?.tireTemperatures?.rearLeft || 0}°C</span>
                </div>
                <div className="tire-temp">
                  <span>RR</span>
                  <span>{carData?.current?.tireTemperatures?.rearRight || 0}°C</span>
                </div>
              </div>
            </div>

            {/* Engine Data */}
            <div className="telemetry-card">
              <h4>Engine</h4>
              <div className="engine-data">
                <div>RPM: {carData?.current?.engine?.rpm || 0}</div>
                <div>Temp: {carData?.current?.engine?.temperature || 0}°C</div>
                <div>Oil: {carData?.current?.engine?.oilPressure || 0} bar</div>
              </div>
            </div>
          </div>

          {/* Speed Chart Placeholder */}
          <div className="speed-chart">
            <h4>Speed History</h4>
            <div className="chart-placeholder">
              Speed chart would be displayed here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Track Visualization Component
function TrackVisualization({ cars }) {
  // Simple track representation
  return (
    <div className="track-visualization">
      <svg viewBox="0 0 400 300" className="track-svg">
        {/* Track outline (simplified Monza circuit) */}
        <path
          d="M50,150 Q100,50 200,50 Q300,50 350,150 Q300,250 200,250 Q100,250 50,150"
          fill="none"
          stroke="#666"
          strokeWidth="20"
        />

        {/* Car positions */}
        {cars.map((car) => (
          <circle
            key={car.carId}
            cx={100 + Math.random() * 200} // Simplified positioning
            cy={100 + Math.random() * 100}
            r="4"
            fill="#ff4b4b"
            className="car-position"
          />
        ))}
      </svg>

      {/* Car labels */}
      <div className="car-labels">
        {cars.slice(0, 5).map((car, index) => (
          <div key={car.carId} className="car-label">
            <span className="position">#{index + 1}</span>
            <span className="driver">{car.driver?.split(' ')[1] || car.carId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RaceDashboard;