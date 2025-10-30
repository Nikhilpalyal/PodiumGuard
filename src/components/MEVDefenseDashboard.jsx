// Enhanced MEV Defense Dashboard Component
import React, { useState, useEffect, useCallback } from 'react';
import './MEVDefenseDashboard.css';

// Mock blockchain service - replace with actual ethers.js implementation
const blockchainService = {
  connectWallet: async () => {
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    return '0x742d35Cc6634C0532925a3b8D39b4b6C5bC947C7';
  },
  enableProtection: async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { hash: '0xabc123...' };
  },
  getProtectionStatus: async () => {
    return Math.random() > 0.5;
  }
};

// Mock real-time data service
const mevDataService = {
  connect: () => {
    console.log('Connected to MEV defense backend');
  },
  subscribe: (event, callback) => {
    // Simulate real-time MEV detections
    if (event === 'mevDetection') {
      const interval = setInterval(() => {
        callback({
          id: Math.random().toString(36).substr(2, 9),
          attackType: ['Sandwich Attack', 'Front-running', 'Back-running', 'Arbitrage'][Math.floor(Math.random() * 4)],
          riskLevel: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
          targetAddress: '0x' + Math.random().toString(16).substr(2, 40),
          potentialLoss: (Math.random() * 0.5).toFixed(4),
          confidence: Math.floor(Math.random() * 30 + 70),
          timestamp: new Date().toISOString(),
          blocked: Math.random() > 0.3
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }
};

const MEVDefenseDashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [mevDetections, setMevDetections] = useState([]);
  const [defenseActive, setDefenseActive] = useState(false);
  const [stats, setStats] = useState({
    totalProtected: 1247,
    threatsBlocked: 89,
    savingsGenerated: 12.456,
    activeUsers: 2341
  });

  // Handle MEV detection events
  const handleMEVDetection = useCallback((detection) => {
    setMevDetections(prev => [detection, ...prev.slice(0, 9)]);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      threatsBlocked: prev.threatsBlocked + (detection.blocked ? 1 : 0),
      savingsGenerated: prev.savingsGenerated + (detection.blocked ? parseFloat(detection.potentialLoss) : 0)
    }));
  }, []);

  useEffect(() => {
    // Initialize services
    mevDataService.connect();
    
    // Subscribe to real-time events
    const unsubscribe = mevDataService.subscribe('mevDetection', handleMEVDetection);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleMEVDetection]);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await blockchainService.connectWallet();
      setWalletAddress(address);
      
      // Check protection status
      const isProtectedStatus = await blockchainService.getProtectionStatus(address);
      setIsProtected(isProtectedStatus);
      setDefenseActive(isProtectedStatus);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleProtection = async () => {
    if (!isProtected) {
      setIsEnabling(true);
      try {
        await blockchainService.enableProtection();
        setIsProtected(true);
        setDefenseActive(true);
        alert('MEV Protection enabled successfully!');
      } catch (error) {
        console.error('Failed to enable protection:', error);
        alert('Failed to enable protection. Please try again.');
      } finally {
        setIsEnabling(false);
      }
    } else {
      setDefenseActive(!defenseActive);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH': return '#ff4757';
      case 'MEDIUM': return '#ffa502';
      case 'LOW': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="mev-defense-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <h1>🛡️ MEV Defense Dashboard</h1>
        <p>Real-time blockchain protection powered by AI</p>
      </div>

      {/* Wallet Connection Section */}
      <div className="wallet-section">
        {!walletAddress ? (
          <button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="connect-btn"
          >
            {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <div className="wallet-address">
              <span className="wallet-icon">👤</span>
              <span>{formatAddress(walletAddress)}</span>
            </div>
            <span className={`protection-status ${isProtected ? 'protected' : 'unprotected'}`}>
              {isProtected ? '🛡️ Protected' : '⚠️ Unprotected'}
            </span>
          </div>
        )}
      </div>

      {/* Protection Controls */}
      {walletAddress && (
        <div className="protection-controls">
          <button 
            onClick={toggleProtection}
            disabled={isEnabling}
            className={`protection-btn ${defenseActive ? 'active' : ''} ${!isProtected ? 'enable' : ''}`}
          >
            {isEnabling ? '⏳ Enabling...' : 
             !isProtected ? '🚀 Enable MEV Protection' :
             defenseActive ? '✅ MEV Defense Active' : '⏸️ Defense Paused'}
          </button>
          
          {isProtected && (
            <div className="protection-info">
              <span className="protection-text">
                🔒 Your transactions are being monitored and protected from MEV attacks
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="stats-section">
        <h3>🏆 Protection Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h4>Total Protected</h4>
              <div className="stat-value">{stats.totalProtected.toLocaleString()}</div>
              <div className="stat-label">Transactions</div>
            </div>
          </div>
          
          <div className="stat-card blocked">
            <div className="stat-icon">🚫</div>
            <div className="stat-content">
              <h4>Threats Blocked</h4>
              <div className="stat-value">{stats.threatsBlocked}</div>
              <div className="stat-label">MEV Attacks</div>
            </div>
          </div>
          
          <div className="stat-card savings">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h4>Value Saved</h4>
              <div className="stat-value">{stats.savingsGenerated.toFixed(3)}</div>
              <div className="stat-label">ETH</div>
            </div>
          </div>
          
          <div className="stat-card users">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h4>Active Users</h4>
              <div className="stat-value">{stats.activeUsers.toLocaleString()}</div>
              <div className="stat-label">Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time MEV Detections */}
      <div className="detections-section">
        <div className="detections-header">
          <h3>⚡ Live MEV Threat Detection</h3>
          <div className="detection-count">
            {mevDetections.length} recent detections
          </div>
        </div>
        
        <div className="detections-container">
          {mevDetections.length === 0 ? (
            <div className="no-detections">
              <div className="scanning-animation">🔍</div>
              <p>Scanning for MEV threats...</p>
            </div>
          ) : (
            <div className="detections-list">
              {mevDetections.map((detection, index) => (
                <div 
                  key={detection.id || index} 
                  className={`detection-card ${detection.riskLevel.toLowerCase()}`}
                  style={{ '--risk-color': getRiskLevelColor(detection.riskLevel) }}
                >
                  <div className="detection-header">
                    <div className="attack-info">
                      <span className="attack-type">⚔️ {detection.attackType}</span>
                      <span 
                        className="risk-badge"
                        style={{ backgroundColor: getRiskLevelColor(detection.riskLevel) }}
                      >
                        {detection.riskLevel}
                      </span>
                    </div>
                    
                    <div className="detection-status">
                      {detection.blocked ? (
                        <span className="blocked">🛡️ BLOCKED</span>
                      ) : (
                        <span className="monitored">👁️ MONITORED</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="detection-details">
                    <div className="detail-row">
                      <span>🎯 Target:</span>
                      <span className="mono">{formatAddress(detection.targetAddress)}</span>
                    </div>
                    <div className="detail-row">
                      <span>💸 Potential Loss:</span>
                      <span className="loss-amount">{detection.potentialLoss} ETH</span>
                    </div>
                    <div className="detail-row">
                      <span>🤖 AI Confidence:</span>
                      <span className="confidence">{detection.confidence}%</span>
                    </div>
                  </div>
                  
                  <div className="detection-footer">
                    <span className="detection-time">
                      ⏰ {new Date(detection.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Network Status */}
      <div className="network-status">
        <div className="status-indicator">
          <div className="pulse-dot"></div>
          <span>🌐 Connected to Ethereum Mainnet</span>
        </div>
        <div className="ai-status">
          <span>🤖 AI Engine: Online</span>
        </div>
      </div>
    </div>
  );
};

export default MEVDefenseDashboard;