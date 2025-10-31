import React from 'react';
import './Leaderboard.css';

function Leaderboard({ cars = [], onCarSelect, selectedCarId }) {
  // Sort cars by position
  const sortedCars = [...cars].sort((a, b) => (a.position || 0) - (b.position || 0));

  const getStatusColor = (status) => {
    switch (status) {
      case 'PIT': return '#ff9800';
      case 'DNF': return '#f44336';
      case 'DNS': return '#9e9e9e';
      default: return '#4caf50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PIT': return 'PIT';
      case 'DNF': return 'DNF';
      case 'DNS': return 'DNS';
      default: return 'ON TRACK';
    }
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h3>🏆 Leaderboard</h3>
        <div className="leaderboard-meta">
          <span className="car-count">{cars.length} cars</span>
          <span className="update-time">Live</span>
        </div>
      </div>

      <div className="leaderboard-list">
        {sortedCars.map((car, index) => (
          <div
            key={car.carId}
            className={`leaderboard-item ${selectedCarId === car.carId ? 'selected' : ''}`}
            onClick={() => onCarSelect && onCarSelect(car)}
          >
            <div className="position-section">
              <div className="position-number">{car.position || index + 1}</div>
              <div
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(car.status) }}
                title={getStatusText(car.status)}
              ></div>
            </div>

            <div className="driver-section">
              <div className="driver-name">{car.driver || `Driver ${car.carId}`}</div>
              <div className="team-name">{car.team || 'Unknown Team'}</div>
            </div>

            <div className="stats-section">
              <div className="primary-stat">
                <span className="speed">{car.speed || 0}</span>
                <span className="unit">km/h</span>
              </div>

              <div className="secondary-stats">
                <div className="stat-item">
                  <span className="label">Gap</span>
                  <span className="value">
                    {car.gapToLeader === 0 ? 'LEADER' : `+${car.gapToLeader || 0}s`}
                  </span>
                </div>

                <div className="stat-item">
                  <span className="label">Lap</span>
                  <span className="value">{car.lapNumber || 1}</span>
                </div>
              </div>
            </div>

            <div className="performance-indicator">
              <div className={`performance-bar ${getPerformanceClass(car)}`}></div>
            </div>
          </div>
        ))}

        {sortedCars.length === 0 && (
          <div className="no-data">
            <p>No race data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getPerformanceClass(car) {
  // Simple performance classification based on speed
  const speed = car.speed || 0;

  if (speed >= 320) return 'exceptional';
  if (speed >= 300) return 'strong';
  if (speed >= 280) return 'steady';
  if (speed >= 250) return 'struggling';
  return 'critical';
}

export default Leaderboard;