import React, { useState, useEffect } from 'react';
import './AlertsPanel.css';

function AlertsPanel({ alerts = [], onAlertClick, maxAlerts = 10 }) {
  const [filter, setFilter] = useState('all'); // all, critical, warning, info
  const [sortBy, setSortBy] = useState('time'); // time, severity, car
  const [expandedAlert, setExpandedAlert] = useState(null);

  // Filter and sort alerts
  const filteredAlerts = alerts
    .filter(alert => {
      if (filter === 'all') return true;
      return alert.severity?.toLowerCase() === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'severity':
          const severityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'WARNING': 1, 'MEDIUM': 1, 'LOW': 0, 'INFO': 0 };
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        case 'car':
          return (a.carId || 0) - (b.carId || 0);
        default:
          return 0;
      }
    })
    .slice(0, maxAlerts);

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return '#f44336';
      case 'HIGH':
        return '#ff5722';
      case 'WARNING':
      case 'MEDIUM':
        return '#ff9800';
      case 'LOW':
      case 'INFO':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'WARNING':
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
      case 'INFO':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAlertStats = () => {
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      warning: alerts.filter(a => ['WARNING', 'MEDIUM'].includes(a.severity)).length,
      info: alerts.filter(a => ['LOW', 'INFO'].includes(a.severity)).length
    };
    return stats;
  };

  const stats = getAlertStats();

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>🚨 Race Alerts</h3>
        <div className="alerts-stats">
          <span className="stat critical">{stats.critical}</span>
          <span className="stat warning">{stats.warning}</span>
          <span className="stat info">{stats.info}</span>
        </div>
      </div>

      <div className="alerts-controls">
        <div className="filter-controls">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={filter === 'critical' ? 'active' : ''}
            onClick={() => setFilter('critical')}
          >
            Critical ({stats.critical})
          </button>
          <button
            className={filter === 'warning' ? 'active' : ''}
            onClick={() => setFilter('warning')}
          >
            Warnings ({stats.warning})
          </button>
          <button
            className={filter === 'info' ? 'active' : ''}
            onClick={() => setFilter('info')}
          >
            Info ({stats.info})
          </button>
        </div>

        <div className="sort-controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="time">Sort by Time</option>
            <option value="severity">Sort by Severity</option>
            <option value="car">Sort by Car</option>
          </select>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <p>No alerts to display</p>
            <small>Filtered by: {filter}</small>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={`${alert.timestamp}-${index}`}
              className={`alert-item ${alert.severity?.toLowerCase()} ${expandedAlert === index ? 'expanded' : ''}`}
              onClick={() => {
                setExpandedAlert(expandedAlert === index ? null : index);
                onAlertClick && onAlertClick(alert);
              }}
              style={{
                borderLeftColor: getSeverityColor(alert.severity),
                backgroundColor: `${getSeverityColor(alert.severity)}15`
              }}
            >
              <div className="alert-main">
                <div className="alert-icon">
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="alert-content">
                  <div className="alert-title">
                    {alert.message || alert.title || 'Alert'}
                  </div>
                  <div className="alert-meta">
                    <span className="alert-car">
                      {alert.carId ? `Car #${alert.carId}` : 'System'}
                    </span>
                    <span className="alert-time">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="alert-actions">
                  <button className="expand-btn">
                    {expandedAlert === index ? '−' : '+'}
                  </button>
                </div>
              </div>

              {expandedAlert === index && (
                <div className="alert-details">
                  <div className="alert-description">
                    {alert.body || alert.description || 'No additional details available.'}
                  </div>

                  {alert.data && (
                    <div className="alert-data">
                      <h5>Technical Details:</h5>
                      <pre>{JSON.stringify(alert.data, null, 2)}</pre>
                    </div>
                  )}

                  <div className="alert-actions-expanded">
                    <button className="acknowledge-btn">Acknowledge</button>
                    <button className="investigate-btn">Investigate</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {filteredAlerts.length > 0 && (
        <div className="alerts-footer">
          <button className="clear-all-btn" onClick={() => {
            // This would clear alerts in a real implementation
            console.log('Clear all alerts');
          }}>
            Clear All
          </button>
          <span className="alerts-count">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </span>
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;